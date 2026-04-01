import argparse
from typing import Dict, List

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine

from db.session import Base

# Register all mapped tables on Base.metadata
from models import (  # noqa: F401
    CarMaker,
    CarMakerAbroad,
    CarModel,
    CarModelAbroad,
    ChargingRecord,
    ConsumableItem,
    Expense,
    FuelRecord,
    MaintenanceRecord,
    Notification,
    Tire,
    User,
    Vehicle,
    VehicleOdometerLog,
    legalinfo,
)


def _chunk_rows(rows: List[Dict], size: int = 1000):
    for i in range(0, len(rows), size):
        yield rows[i : i + size]


def _truncate_target(engine: Engine) -> None:
    tables = list(Base.metadata.sorted_tables)
    with engine.begin() as conn:
        for table in reversed(tables):
            conn.execute(text(f'TRUNCATE TABLE "{table.name}" RESTART IDENTITY CASCADE'))


def _copy_data(source: Engine, target: Engine) -> None:
    src_inspector = inspect(source)
    with source.connect() as src, target.begin() as dst:
        for table in Base.metadata.sorted_tables:
            source_column_names = {
                col["name"] for col in src_inspector.get_columns(table.name)
            }
            target_column_names = [col.name for col in table.columns]
            common_columns = [c for c in target_column_names if c in source_column_names]
            missing_columns = [c for c in target_column_names if c not in source_column_names]

            if not common_columns:
                print(f"[SKIP] {table.name}: no compatible columns")
                continue

            select_cols_sql = ", ".join(f'"{name}"' for name in common_columns)
            rows = src.execute(text(f'SELECT {select_cols_sql} FROM "{table.name}"')).mappings().all()
            if not rows:
                print(f"[SKIP] {table.name}: 0 rows")
                continue
            for chunk in _chunk_rows(rows, 1000):
                dst.execute(table.insert(), [dict(r) for r in chunk])
            if missing_columns:
                print(
                    f"[COPY] {table.name}: {len(rows)} rows "
                    f"(missing in source: {', '.join(missing_columns)})"
                )
            else:
                print(f"[COPY] {table.name}: {len(rows)} rows")


def _sync_sequences(engine: Engine) -> None:
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            for col in table.columns:
                if not col.primary_key:
                    continue
                serial_seq = conn.execute(
                    text("SELECT pg_get_serial_sequence(:tbl, :col)"),
                    {"tbl": f'"public"."{table.name}"', "col": col.name},
                ).scalar()
                if not serial_seq:
                    continue
                max_id = conn.execute(
                    text(f'SELECT COALESCE(MAX("{col.name}"), 0) FROM "{table.name}"')
                ).scalar()
                if max_id and int(max_id) > 0:
                    conn.execute(
                        text("SELECT setval(:seq, :v, true)"),
                        {"seq": serial_seq, "v": int(max_id)},
                    )
                else:
                    conn.execute(
                        text("SELECT setval(:seq, 1, false)"),
                        {"seq": serial_seq},
                    )
                print(f"[SEQ] {table.name}.{col.name} -> {max_id}")


def _print_counts(source: Engine, target: Engine) -> None:
    with source.connect() as src, target.connect() as dst:
        for table in Base.metadata.sorted_tables:
            src_cnt = src.execute(text(f'SELECT COUNT(*) FROM "{table.name}"')).scalar()
            dst_cnt = dst.execute(text(f'SELECT COUNT(*) FROM "{table.name}"')).scalar()
            mark = "OK" if src_cnt == dst_cnt else "DIFF"
            print(f"[{mark}] {table.name}: source={src_cnt}, target={dst_cnt}")


def parse_args():
    parser = argparse.ArgumentParser(description="Migrate current DB data to target Supabase DB.")
    parser.add_argument("--source-url", required=True, help="Source DATABASE_URL")
    parser.add_argument("--target-url", required=True, help="Target DATABASE_URL")
    parser.add_argument(
        "--skip-truncate",
        action="store_true",
        help="Do not truncate target tables before copy",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    if args.source_url.strip() == args.target_url.strip():
        raise ValueError("source-url and target-url must be different.")

    source_engine = create_engine(args.source_url, pool_pre_ping=True)
    target_engine = create_engine(args.target_url, pool_pre_ping=True)

    print("Creating target schema from SQLAlchemy metadata...")
    Base.metadata.create_all(bind=target_engine)

    if not args.skip_truncate:
        print("Truncating target tables...")
        _truncate_target(target_engine)

    print("Copying data...")
    _copy_data(source_engine, target_engine)

    print("Syncing sequences...")
    _sync_sequences(target_engine)

    print("Verifying row counts...")
    _print_counts(source_engine, target_engine)
    print("Migration completed.")


if __name__ == "__main__":
    main()

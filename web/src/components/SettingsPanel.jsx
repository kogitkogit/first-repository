import { useState } from "react";
import api from "../api/client";
import ConfirmDialog from "./ui/ConfirmDialog";
import DocumentModal from "./ui/DocumentModal";
import { useToast } from "./ui/ToastProvider";
import { APP_NAME, POLICY_DOCUMENTS } from "../content/policyDocuments";

function SectionCard({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-card">
      <h3 className="text-lg font-semibold text-text-light">{title}</h3>
      {description ? <p className="mt-1 text-sm text-subtext-light">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-border-light bg-background-light/70 px-4 py-3">
      <p className="text-sm font-semibold text-text-light">{label}</p>
      <p className="mt-1 text-sm font-medium text-subtext-light">{value}</p>
      {description ? <p className="mt-1 text-xs leading-5 text-subtext-light">{description}</p> : null}
    </div>
  );
}

function DocActionButton({ children, onClick }) {
  return (
    <button
      type="button"
      className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function SettingsPanel({ userId, vehicle, username, accountType, onAccountDeleted }) {
  const { showToast } = useToast();
  const [activeDoc, setActiveDoc] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!userId || !vehicle) {
    return <div className="p-4 text-sm text-subtext-light">차량을 먼저 선택한 뒤 다시 시도해주세요.</div>;
  }

  const isGuest = accountType === "guest";
  const activeDocument = activeDoc ? POLICY_DOCUMENTS[activeDoc] : null;

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await api.delete("/auth/me");
      showToast({ tone: "success", message: "탈퇴가 완료되었습니다.", placement: "center", duration: 1800 });
      setConfirmDelete(false);
      if (onAccountDeleted) onAccountDeleted();
    } catch (error) {
      console.error("회원 탈퇴 실패:", error);
      showToast({ tone: "error", message: "회원 탈퇴에 실패했습니다. 다시 시도해주세요." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 pb-28">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-text-light">설정</h2>
        <p className="text-sm text-subtext-light">{APP_NAME} 계정 상태와 문서를 확인할 수 있습니다.</p>
      </div>

      <SectionCard title="계정 정보" description="현재 사용 중인 계정 상태와 복구 가능 여부를 확인하세요.">
        <div className="space-y-3">
          <InfoRow
            label="계정 유형"
            value={isGuest ? "비회원 계정" : "회원 계정"}
            description={
              isGuest
                ? "비회원 계정은 빠르게 시작할 수 있지만 앱 삭제 또는 기기 변경 시 데이터 복구가 어려울 수 있습니다."
                : "회원 계정은 같은 아이디와 비밀번호로 다시 로그인하면 데이터를 이어서 사용할 수 있습니다."
            }
          />
          <InfoRow
            label="계정명"
            value={username || "-"}
            description="회원 계정은 로그인에 사용되는 아이디이며, 비회원 계정은 내부 임시 계정명으로 관리됩니다."
          />
        </div>
      </SectionCard>

      <SectionCard title="백업 및 복구 정책" description="복구 범위와 제한 사항을 문서로 확인할 수 있습니다.">
        <div className="space-y-3">
          <InfoRow
            label="현재 복구 상태"
            value={isGuest ? "복구 제한" : "로그인으로 복구 가능"}
            description={
              isGuest
                ? "비회원 계정은 회원 전환 전까지 별도 복구 수단이 없습니다."
                : "회원 계정은 동일한 계정으로 다시 로그인하면 서버에 저장된 데이터를 이어서 사용할 수 있습니다."
            }
          />
          <DocActionButton onClick={() => setActiveDoc("backup")}>백업 및 복구 정책은 여기에서 확인해주세요</DocActionButton>
        </div>
      </SectionCard>

      <SectionCard title="개인정보처리방침" description="앱 안에서 바로 문서를 확인할 수 있습니다.">
        <div className="space-y-3">
          <InfoRow
            label="개인정보 문서"
            value="앱 내 문서 제공"
            description="앱 안에서 바로 문서를 열어 확인할 수 있습니다."
          />
          <DocActionButton onClick={() => setActiveDoc("privacy")}>개인정보처리방침은 여기에서 확인해주세요</DocActionButton>
        </div>
      </SectionCard>

      <SectionCard title="서비스 이용 안내" description="서비스 성격과 계정 이용 방식을 다시 확인할 수 있습니다.">
        <DocActionButton onClick={() => setActiveDoc("terms")}>서비스 이용 안내는 여기에서 확인해주세요</DocActionButton>
      </SectionCard>

      <SectionCard title="계정 관리" description="탈퇴 시 계정과 연결된 차량 및 기록 데이터가 함께 삭제됩니다.">
        <button
          type="button"
          className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100"
          onClick={() => setConfirmDelete(true)}
        >
          회원 탈퇴
        </button>
      </SectionCard>

      <DocumentModal
        open={Boolean(activeDocument)}
        title={activeDocument?.title}
        effectiveDate={activeDocument?.effectiveDate}
        sections={activeDocument?.sections || []}
        onClose={() => setActiveDoc(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="탈퇴하시겠습니까?"
        description="데이터 복구가 어려울 수 있습니다."
        confirmLabel="탈퇴"
        cancelLabel="취소"
        tone="danger"
        loading={deleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => {
          if (!deleting) setConfirmDelete(false);
        }}
      />
    </div>
  );
}

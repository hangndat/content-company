import type { ComponentProps } from "react";
import type { ModalForm } from "@ant-design/pro-components";

type ModalFormModalProps = NonNullable<ComponentProps<typeof ModalForm>["modalProps"]>;

type SubmitterOpts = {
  submitting: boolean;
  submitText: string;
  onClose: () => void;
};

export function opsModalSubmitter({ submitting, submitText, onClose }: SubmitterOpts) {
  return {
    submitButtonProps: { loading: submitting },
    searchConfig: { submitText, resetText: "Hủy" },
    resetButtonProps: { onClick: onClose },
  };
}

export function opsModalProps(onClose: () => void): ModalFormModalProps {
  return {
    destroyOnClose: true,
    onCancel: onClose,
    maskClosable: false,
  };
}

export function opsModalOpenChange(onClose: () => void) {
  return (visible: boolean) => {
    if (!visible) onClose();
  };
}

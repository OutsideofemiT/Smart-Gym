import type { SetStateAction } from "react";

export interface ModalProps {
  show: boolean;
  setShow: React.Dispatch<SetStateAction<boolean>>;
}

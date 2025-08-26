import type { SetStateAction } from "react";

export interface ModalProps {
  show: boolean;
  setShow: React.Dispatch<SetStateAction<boolean>>;
  setRenderInventory: React.Dispatch<SetStateAction<boolean>>;
}

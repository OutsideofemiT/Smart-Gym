import type { SetStateAction } from "react";

export interface InventoryItem {
  _id: string;
  item_name: string;
  price: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModalProps {
  show: boolean;
  setShow: React.Dispatch<SetStateAction<boolean>>;
  setRenderInventory: React.Dispatch<SetStateAction<boolean>>;
  selectedItems?: InventoryItem[];
}

export type ItemInput = {
  name: string;
  price: string;
  quantity: string;
};

export type FormattedItems = {
  item_name: string;
  price: number;
  quantity: number;
};

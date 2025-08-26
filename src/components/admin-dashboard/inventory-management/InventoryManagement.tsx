import { useEffect, useMemo, useState, type SetStateAction } from "react";
import ApiHandler from "../../../utils/ApiHandler";
import AddItemsModal from "./AddItemsModal";
import EditItemsModal from "./EditItemsModal";
import DeleteItemsModal from "./DeleteItemsModal";
import { format } from "date-fns";
import { FaEdit, FaRegPlusSquare, FaTrashAlt } from "react-icons/fa";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  themeAlpine,
  ModuleRegistry,
  type GridOptions,
  type SizeColumnsToFitGridStrategy,
  iconSetQuartz,
  type ColGroupDef,
} from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);
import "../../../styles/InventoryManagement.css";

type ModalContent = "add" | "edit" | "delete" | null;

interface InventoryItem {
  _id: string;
  item_name: string;
  price: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

interface InventoryHeaderProps {
  setShow: React.Dispatch<SetStateAction<boolean>>;
  setModalContent: React.Dispatch<SetStateAction<ModalContent>>;
}

const InventoryHeader: React.FC<InventoryHeaderProps> = ({
  setShow,
  setModalContent,
}) => {
  const handleShowModal = (content: ModalContent) => {
    setModalContent(content);
    setShow(true);
  };
  return (
    <div className="ag-cell-label-container" role="presentation">
      <div className="manage-inventory-tools">
        <span data-ref="eText" className="ag-header-cell-text">
          Manage Items:
        </span>
        <span
          data-ref="eText"
          className="ag-header-icon add-inventory-icon"
          onClick={() => handleShowModal("add")}
        >
          <FaRegPlusSquare />
        </span>
        <span
          data-ref="eText"
          className="ag-header-icon edit-inventory-icon"
          onClick={() => handleShowModal("edit")}
        >
          <FaEdit />
        </span>
        <span
          data-ref="eText"
          className="ag-header-icon delete-inventory-icon"
          onClick={() => handleShowModal("delete")}
        >
          <FaTrashAlt />
        </span>
      </div>
      <div
        data-ref="eLabel"
        className="ag-header-cell-label"
        role="presentation"
      >
        <span data-ref="eText" className="ag-header-cell-text">
          Cafe Inventory
        </span>
      </div>
    </div>
  );
};

const InventoryManagement: React.FC = () => {
  const [show, setShow] = useState(false);
  const [modalContent, setModalContent] = useState<ModalContent>(null);
  const [renderInventory, setRenderInventory] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const colDefs: ColGroupDef[] = [
    {
      headerName: "Cafe Inventory",
      headerGroupComponent: InventoryHeader,
      headerGroupComponentParams: { setShow, setModalContent },
      children: [
        { field: "_id", headerName: "ID", colId: "ID" },
        { field: "item_name", headerName: "Item Name" },
        {
          field: "price",
          headerName: "Price",
          valueFormatter: (p) =>
            p.value.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            }),
          colId: "Price",
        },
        { field: "quantity", headerName: "Quantity", colId: "Quantity" },
        {
          field: "createdAt",
          headerName: "Date Added (YYYY-MM-DD)",
          valueFormatter: (p) => format(p.value, "yyyy-MM-dd HH:mm:ss"),
        },
        {
          field: "updatedAt",
          headerName: "Last Updated (YYYY-MM-DD)",
          valueFormatter: (p) => format(p.value, "yyyy-MM-dd HH:mm:ss"),
        },
      ],
    },
  ];

  const rowSelection: GridOptions["rowSelection"] = useMemo(() => {
    return { mode: "multiRow" };
  }, [renderInventory]);

  const autoSizeStrategy: SizeColumnsToFitGridStrategy = useMemo(() => {
    return {
      type: "fitGridWidth",
      columnLimits: [
        {
          colId: "ID",
          minWidth: 300,
        },
        {
          colId: "Price",
          maxWidth: 180,
        },
        {
          colId: "Quantity",
          maxWidth: 180,
        },
      ],
    };
  }, []);

  const myTheme = themeAlpine.withPart(iconSetQuartz).withParams({
    selectedRowBackgroundColor: "#11ff7029",
  });

  const modal = ((): React.ReactNode => {
    switch (modalContent) {
      case "add":
        return (
          <AddItemsModal
            show={show}
            setShow={setShow}
            setRenderInventory={setRenderInventory}
          />
        );
        break;
      case "edit":
        return (
          <EditItemsModal
            show={show}
            setShow={setShow}
            setRenderInventory={setRenderInventory}
          />
        );
        break;
      case "delete":
        return (
          <DeleteItemsModal
            show={show}
            setShow={setShow}
            setRenderInventory={setRenderInventory}
          />
        );
        break;
    }
  })();

  const fetchAllInventory = async () => {
    try {
      const { data } = await ApiHandler.get("/cafe-inventory/");

      setItems(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchAllInventory();
    setRenderInventory(false);
  }, [renderInventory]);

  return (
    <div className="inventory-management-container">
      <div className="inventory-list-wrapper">
        <div style={{ width: "1500px" }}>
          <AgGridReact
            rowData={items}
            columnDefs={colDefs}
            rowSelection={rowSelection}
            autoSizeStrategy={autoSizeStrategy}
            theme={myTheme}
            domLayout="autoHeight"
          />
        </div>
      </div>
      {show && <div className="modal">{modal}</div>}
    </div>
  );
};
export default InventoryManagement;

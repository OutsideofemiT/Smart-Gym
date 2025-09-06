import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type SetStateAction,
} from "react";
import ApiHandler from "../../../utils/ApiHandler";
import AddItemsModal from "./AddItemsModal";
import EditItemsModal from "./EditItemsModal";
import DeleteItemsModal from "./DeleteItemsModal";
import { format } from "date-fns";
import { FaEdit, FaRegPlusSquare, FaTrashAlt } from "react-icons/fa";
import Alert from "react-bootstrap/Alert";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  themeAlpine,
  ModuleRegistry,
  type GridOptions,
  type SizeColumnsToFitGridStrategy,
  iconSetQuartz,
  type ColGroupDef,
  type GridApi,
} from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);
import type { InventoryItem } from "../../../types/InventoryManagement.interface";
import "../../../styles/InventoryManagement.css";

type ModalContent = "add" | "edit" | "delete" | null;

interface InventoryHeaderProps {
  setShow: React.Dispatch<SetStateAction<boolean>>;
  setModalContent: React.Dispatch<SetStateAction<ModalContent>>;
  setSelectedItems: React.Dispatch<SetStateAction<InventoryItem[]>>;
  getSelectedRows: () => InventoryItem[];
}

const InventoryHeader: React.FC<InventoryHeaderProps> = ({
  setShow,
  setModalContent,
  setSelectedItems,
  getSelectedRows,
}) => {
  const [noSelectionWarning, setNoSelectionWarning] = useState<boolean>(false);
  const handleShowModal = (content: ModalContent) => {
    if (content === "edit" || content === "delete") {
      const selected = getSelectedRows();
      if (selected.length === 0) {
        setNoSelectionWarning(true);
        setTimeout(() => setNoSelectionWarning(false), 3000);
        return;
      }
      setSelectedItems(selected);
    }
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
          title="Add Items"
        >
          <FaRegPlusSquare />
        </span>
        <span
          data-ref="eText"
          className="ag-header-icon edit-inventory-icon"
          onClick={() => handleShowModal("edit")}
          title="Update Items"
        >
          <FaEdit />
        </span>
        <span
          data-ref="eText"
          className="ag-header-icon delete-inventory-icon"
          onClick={() => handleShowModal("delete")}
          title="Delete Items"
        >
          <FaTrashAlt />
        </span>
      </div>
      {noSelectionWarning ? (
        <Alert className="no-selection-warning" variant="danger">
          No Items selected
        </Alert>
      ) : (
        ""
      )}
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
  const gridApiRef = useRef<GridApi | null>(null);
  const [show, setShow] = useState(false);
  const [modalContent, setModalContent] = useState<ModalContent>(null);
  const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([]);
  const [renderInventory, setRenderInventory] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const colDefs: ColGroupDef[] = [
    {
      headerName: "Cafe Inventory",
      headerGroupComponent: InventoryHeader,
      headerGroupComponentParams: {
        setShow,
        setModalContent,
        setSelectedItems,
        getSelectedRows: () => gridApiRef.current?.getSelectedRows() ?? [],
      },
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

  const onGridReady = (params: { api: GridApi }) => {
    gridApiRef.current = params.api;
  };

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
            selectedItems={selectedItems}
          />
        );
        break;
      case "delete":
        return (
          <DeleteItemsModal
            show={show}
            setShow={setShow}
            setRenderInventory={setRenderInventory}
            selectedItems={selectedItems}
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
            onGridReady={onGridReady}
          />
        </div>
      </div>
      {show && <div className="modal">{modal}</div>}
    </div>
  );
};
export default InventoryManagement;

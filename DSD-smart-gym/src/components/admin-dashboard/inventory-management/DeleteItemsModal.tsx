import type {
  InventoryItem,
  ModalProps,
} from "../../../types/InventoryManagement.interface";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";

const DeleteItemsModal: React.FC<ModalProps> = ({
  show,
  selectedItems,
  setShow,
  setRenderInventory,
}) => {
  const handleClose = () => setShow(false);

  const handleDeleteItems = async () => {
    try {
      const formattedData = selectedItems?.map((item) => ({ _id: item._id }));
      const API_BASE_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_BASE_URL}/cafe-inventory/bulk`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer " +
            (localStorage.getItem("authToken") ||
              localStorage.getItem("token")),
        },
        credentials: "include",
        body: JSON.stringify(formattedData),
      });
      await response.json();
      setRenderInventory(true);
      handleClose();
    } catch (error) {
      console.error(error);
    }
  };
  return (
    <>
      <Modal
        show={show}
        onHide={handleClose}
        className="inventory-management-modal delete-items-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Inventory Items</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete the following items?</p>
          <Table>
            <thead>
              <tr>
                <th>Item</th>
                <th>ID</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems?.map((item: InventoryItem, index) => (
                <tr key={index}>
                  <td>{item.item_name}</td>
                  <td>{item._id}</td>
                  <td>{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleDeleteItems}>
            Delete Items
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default DeleteItemsModal;

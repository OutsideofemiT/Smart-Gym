import { useState, type ChangeEvent } from "react";
import type {
  ModalProps,
  ItemInput,
} from "../../../types/InventoryManagement.interface";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
type UpdatedItemInput = {
  [_id: string]: ItemInput;
};

const EditItemsModal: React.FC<ModalProps> = ({
  show,
  selectedItems,
  setShow,
}) => {
  const [updatedItems, setUpdatedItems] = useState<UpdatedItemInput>({});
  const handleClose = () => setShow(false);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    property: keyof ItemInput,
    index: number
  ) => {
    const itemId = selectedItems?.[index]._id;

    if (!itemId) return;

    const item = updatedItems[itemId] ?? {
      name: selectedItems[index].item_name,
      price: selectedItems[index].price,
      quantity: selectedItems[index].quantity,
    };

    const updatedItem = { ...item, [property]: e.target.value };
    setUpdatedItems((prev) => ({ ...prev, [itemId]: updatedItem }));
  };
  return (
    <>
      <Modal
        show={show}
        onHide={handleClose}
        className="inventory-management-modal update-items-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Update Items</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItems?.map((item, index) => (
            <Form className="update-items-input-entry">
              <Form.Group className="mb-3" controlId="formId">
                <Form.Label>ID</Form.Label>
                <Form.Control
                  type="text"
                  key={index}
                  value={item._id}
                  autoFocus
                  disabled
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formItemName">
                <Form.Label>Item Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder={item.item_name}
                  key={index}
                  onChange={(e) => handleInputChange(e, "name", index)}
                  value={updatedItems[item._id]?.name ?? item.item_name}
                  autoFocus
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formPrice">
                <Form.Label>Price</Form.Label>
                <Form.Control
                  type="number"
                  placeholder={item.price}
                  key={index}
                  onChange={(e) => handleInputChange(e, "price", index)}
                  value={updatedItems[item._id]?.price ?? item.price}
                  autoFocus
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formQuantity">
                <Form.Label>Quantity</Form.Label>
                <Form.Control
                  type="number"
                  placeholder={`${item.quantity}`}
                  key={index}
                  onChange={(e) => handleInputChange(e, "quantity", index)}
                  value={updatedItems[item._id]?.quantity ?? item.quantity}
                  autoFocus
                />
              </Form.Group>
            </Form>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleClose}>
            Update Items
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default EditItemsModal;

import { useState, type ChangeEvent } from "react";
import type {
  ModalProps,
  ItemInput,
  FormattedItems,
} from "../../../types/InventoryManagement.interface";
import ApiHandler from "../../../utils/ApiHandler";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Alert from "react-bootstrap/Alert";

type UpdatedItemInput = {
  [_id: string]: ItemInput;
};

type UpdatedItemsFormatted = {
  _id: string;
} & FormattedItems;

const EditItemsModal: React.FC<ModalProps> = ({
  show,
  selectedItems,
  setShow,
  setRenderInventory,
}) => {
  const [updatedItems, setUpdatedItems] = useState<UpdatedItemInput>({});
  const [emptyInputs, setEmptyInputs] = useState(new Set());
  const [inputErrors, setInputErrors] = useState(new Set());

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

  const handleUpdateItems = async () => {
    const formattedItems: UpdatedItemsFormatted[] = [];

    try {
      let inputError = false;
      for (const id in updatedItems) {
        const item = updatedItems[id];

        const pricePattern = /^\d+(\.\d{0,2})?$/;
        const priceRegex = new RegExp(pricePattern);
        const quantityPattern = /^\d+$/;
        const quantityRegex = new RegExp(quantityPattern);

        if (!item.name || !item.price || !item.quantity) {
          inputError = true;
          setEmptyInputs((prev) => new Set(prev).add(id));
        } else if (
          !priceRegex.test(item.price) ||
          !quantityRegex.test(item.quantity)
        ) {
          inputError = true;
          setInputErrors((prev) => new Set(prev).add(id));
        } else {
          if (!inputError) {
            const formattedInput = {
              _id: id,
              item_name: item.name,
              price: Number(item.price),
              quantity: Number(item.quantity),
            };
            formattedItems.push(formattedInput);
          }
        }
      }
      if (inputError) {
        throw Error;
      } else {
        await ApiHandler.put("/cafe-inventory/bulk", formattedItems);
        setRenderInventory(true);
        handleClose();
      }
    } catch (error) {
      setTimeout(() => {
        setInputErrors(new Set());
        setEmptyInputs(new Set());
      }, 5000);
    }
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
              {emptyInputs.has(item._id) ? (
                <Alert className="item-input-error" variant="danger">
                  Fill in missing information or remove entry.
                </Alert>
              ) : (
                ""
              )}
              {inputErrors.has(item._id) ? (
                <Alert className="item-input-error" variant="danger">
                  Use correct format: Price: 0.00 & Quantity: 0
                </Alert>
              ) : (
                ""
              )}
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
          <Button variant="primary" onClick={handleUpdateItems}>
            Update Items
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default EditItemsModal;

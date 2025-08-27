import { useState, type ChangeEvent } from "react";
import type { ModalProps } from "../../../types/InventoryManagement.interface";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Alert from "react-bootstrap/Alert";
import { FcAddRow } from "react-icons/fc";
import { GrFormSubtract } from "react-icons/gr";
import ApiHandler from "../../../utils/ApiHandler";
import type {
  ItemInput,
  FormattedItems,
} from "../../../types/InventoryManagement.interface";

const AddItemsModal: React.FC<ModalProps> = ({
  show,
  setShow,
  setRenderInventory,
}) => {
  const [inputs, setInputs] = useState<ItemInput[]>([
    { name: "", price: "", quantity: "" },
  ]);
  const [emptyInputs, setEmptyInputs] = useState(new Set());
  const [inputErrors, setInputErrors] = useState(new Set());

  const handleClose = () => setShow(false);

  const addInput = () => {
    setInputs([...inputs, { name: "", price: "", quantity: "" }]);
  };

  const deleteInput = (index: number) => {
    let newInputs = [...inputs];
    newInputs.splice(index, 1);
    setInputs(newInputs);
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    property: keyof ItemInput,
    index: number
  ) => {
    const newInputs = [...inputs];
    newInputs[index][property] = e.target.value;
    setInputs(newInputs);
  };

  const handleAddItems = async () => {
    try {
      const formattedItems: FormattedItems[] = [];
      let inputError = false;
      inputs.forEach((input, idx) => {
        const pricePattern = /^\d+(\.\d{0,2})?$/;
        const priceRegex = new RegExp(pricePattern);
        const quantityPattern = /^\d+$/;
        const quantityRegex = new RegExp(quantityPattern);

        if (!input.name || !input.price || !input.quantity) {
          inputError = true;
          setEmptyInputs((prev) => new Set(prev).add(idx));
        } else if (
          !priceRegex.test(input.price) ||
          !quantityRegex.test(input.quantity)
        ) {
          inputError = true;
          setInputErrors((prev) => new Set(prev).add(idx));
        } else {
          if (!inputError) {
            const formattedInput = {
              item_name: input.name,
              price: Number(input.price),
              quantity: Number(input.quantity),
            };
            formattedItems.push(formattedInput);
          }
        }
      });
      if (inputError) {
        throw Error;
      } else {
        await ApiHandler.post("/cafe-inventory/bulk", formattedItems);
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
        className="inventory-management-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Inventory Items</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {inputs.map((input, index) => (
            <Form className="add-items-input-entry">
              {emptyInputs.has(index) ? (
                <Alert className="item-input-error" variant="danger">
                  Fill in missing information or remove entry.
                </Alert>
              ) : (
                ""
              )}
              {inputErrors.has(index) ? (
                <Alert className="item-input-error" variant="danger">
                  Use correct format: Price: 0.00 & Quantity: 0
                </Alert>
              ) : (
                ""
              )}
              <Form.Group className="mb-3" controlId="formItemName">
                <Form.Label>Item Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Protein Meal Bar"
                  key={index}
                  onChange={(e) => handleInputChange(e, "name", index)}
                  value={input.name}
                  autoFocus
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formPrice">
                <Form.Label>Price</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="8.00"
                  key={index}
                  onChange={(e) => handleInputChange(e, "price", index)}
                  value={input.price}
                  autoFocus
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formQuantity">
                <Form.Label>Quantity</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="10"
                  key={index}
                  onChange={(e) => handleInputChange(e, "quantity", index)}
                  value={input.quantity}
                  autoFocus
                />
              </Form.Group>
              <Form.Text
                className="text-muted delete-entry-button"
                title="Delete Entry"
                onClick={() => deleteInput(index)}
              >
                <GrFormSubtract />
              </Form.Text>
            </Form>
          ))}
          <Form.Text
            className="text-muted add-entry-button"
            title="Add Entry"
            onClick={addInput}
          >
            <FcAddRow />
          </Form.Text>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleAddItems}>
            Add Items
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AddItemsModal;

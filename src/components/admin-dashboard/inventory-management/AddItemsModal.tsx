import { useState, type ChangeEvent } from "react";
import type { ModalProps } from "../../../types/InventoryManagement.interface";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Alert from "react-bootstrap/Alert";
import { FcAddRow } from "react-icons/fc";
import { GrFormSubtract } from "react-icons/gr";

type ItemInput = {
  name: string;
  price: string;
  quantity: string;
};

const AddItemsModal: React.FC<ModalProps> = ({ show, setShow }) => {
  const [inputs, setInputs] = useState<ItemInput[]>([
    { name: "", price: "", quantity: "" },
  ]);
  const [emptyInputs, setEmptyInputs] = useState(new Set());
  const [inputErrors, setInputErrors] = useState(new Set());

  const handleClose = () => setShow(false);

  const addInput = () => {
    setInputs([...inputs, { name: "", price: "", quantity: "" }]);
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

  const handleAddItems = () => {
    try {
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
        }
      });
      if (inputError) throw Error;
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
          {inputs.map((__, index) => (
            <Form className="add-items-input-entry">
              {emptyInputs.has(index) ? (
                <Alert className="item-input-error" variant="danger">
                  Remove unused entry.
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
              <Form.Group
                className="mb-3 item-name-input"
                controlId="exampleForm.ControlInput1"
              >
                <Form.Label>Item Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Protein Meal Bar"
                  key={index}
                  onChange={(e) => handleInputChange(e, "name", index)}
                  autoFocus
                />
              </Form.Group>
              <Form.Group
                className="mb-3 item-price-input"
                controlId="exampleForm.ControlTextarea1"
              >
                <Form.Label>Price</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="8.00"
                  key={index}
                  onChange={(e) => handleInputChange(e, "price", index)}
                  autoFocus
                />
              </Form.Group>
              <Form.Group
                className="mb-3 item-quantity-input"
                controlId="exampleForm.ControlInput1"
              >
                <Form.Label>Quantity</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="10"
                  key={index}
                  onChange={(e) => handleInputChange(e, "quantity", index)}
                  autoFocus
                />
              </Form.Group>
              <Form.Text
                className="text-muted delete-entry-button"
                title="Delete Entry"
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

import type { ModalProps } from "../../../types/InventoryManagement.interface";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { FcAddRow } from "react-icons/fc";
import { GrFormSubtract } from "react-icons/gr";

const AddItemsModal: React.FC<ModalProps> = ({ show, setShow }) => {
  const handleClose = () => setShow(false);
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
          <Form className="add-items-input-entry">
            <Form.Group
              className="mb-3 item-name-input"
              controlId="exampleForm.ControlInput1"
            >
              <Form.Label>Item Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Protein Meal Bar"
                autoFocus
              />
            </Form.Group>
            <Form.Group
              className="mb-3 item-price-input"
              controlId="exampleForm.ControlTextarea1"
            >
              <Form.Label>Price</Form.Label>
              <Form.Control type="text" placeholder="8.00" autoFocus />
            </Form.Group>
            <Form.Group
              className="mb-3 item-quantity-input"
              controlId="exampleForm.ControlInput1"
              item-quantity-input
            >
              <Form.Label>Quantity</Form.Label>
              <Form.Control type="number" placeholder="10" autoFocus />
            </Form.Group>
            <Form.Text
              className="text-muted add-entry-button"
              title="Add Entry"
            >
              <FcAddRow />
            </Form.Text>
            <Form.Text
              className="text-muted delete-entry-button"
              title="Delete Entry"
            >
              <GrFormSubtract />
            </Form.Text>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleClose}>
            Add Items
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AddItemsModal;

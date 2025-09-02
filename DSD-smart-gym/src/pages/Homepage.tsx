import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import yogaVideo from "../assets/yoga.mp4";
import Members from "../assets/SG_Members.png";
import boxingImage from "../assets/boxing-class.jpg";
import workoutImage from "../assets/workout.jpg";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Accordion from "react-bootstrap/Accordion";

import ApiHandler from "../utils/ApiHandler";

import "../styles/homepage.css";
import "../styles/HomepageNavBar.css";

type UserRole = "admin" | "member" | "trainer";

interface LoginResponseLegacy {
  authToken: string;
  user?: { email: string; role: UserRole; gym_id?: string };
  email?: string;
  role?: UserRole;
  gym_id?: string;
}

const Homepage: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const data = (await ApiHandler.login(email, password)) as LoginResponseLegacy;

      const token = data?.authToken;
      const roleRaw: UserRole | undefined =
        data?.user?.role ?? (data?.role as UserRole | undefined);
      const role = (roleRaw as string | undefined)?.toLowerCase() as UserRole | undefined;
      const userEmail = data?.user?.email ?? data?.email;
      const gym_id = data?.user?.gym_id ?? data?.gym_id;

      if (!token || !role || !userEmail) {
        throw new Error("Missing fields from server (authToken, email, role).");
      }

      localStorage.setItem("authToken", token);
      localStorage.setItem("role", role);
      localStorage.setItem("email", userEmail);
      if (gym_id) localStorage.setItem("gym_id", String(gym_id));

      setMessage("✅ Logged in successfully!");
      setEmail("");
      setPassword("");

      if (role === "admin" || role === "trainer") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/member", { replace: true });
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setMessage(`❌ Login failed: ${err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="homepage">
      <section className="hero">
        <video className="hero__video" autoPlay muted loop playsInline>
          <source src={yogaVideo} type="video/mp4" />
        </video>
        <div className="hero__overlay">
          <div className="homepage-banner">
            <h2>Smarter Fitness. Wherever You Are.</h2>
            <h3>Discover a smarter all-in-one health solution.</h3>

            <Accordion className="login-container">
              <Accordion.Item eventKey="0">
                <Accordion.Header>Log into your smart experience</Accordion.Header>
                <Accordion.Body>
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="formBasicEmail">
                      <Form.Label>Email address</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Enter email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formBasicPassword">
                      <Form.Label>Password</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </Form.Group>

                    <Button variant="dark" type="submit" id="submit-button" disabled={loading}>
                      {loading ? "Logging in…" : "Log in"}
                    </Button>
                  </Form>

                  {message && <p className="login-message">{message}</p>}
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </div>
        </div>
      </section>

      <section className="feature-panel">
        <div>
          <img alt="front desk and facilities" src={Members} />
          <h3>Modern, Member-First Gym</h3>
          <p>Bright spaces, quality equipment, and a supportive community.</p>
          <Link to="/nonmember/membership" className="feature-cta">Why Smart Gym →</Link>
        </div>
        <div>
          <img alt="two people training in the gym" src={workoutImage} />
          <h3>Flexible Memberships</h3>
          <p>Pick a plan that fits your routine—join online in minutes.</p>
          <Link to="/nonmember/join" className="feature-cta">See Plans →</Link>
        </div>

        <div>
          <img alt="boxing class" src={boxingImage} />
          <h3>Classes for Every Level</h3>
          <p>From Yoga to HIIT, browse schedules and find your perfect pace.</p>
          <Link to="/nonmember/classes" className="feature-cta">Explore Classes →</Link>
        </div>
      </section>
    </div>
  );
};

export default Homepage;

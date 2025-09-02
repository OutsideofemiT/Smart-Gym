import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Membership.css";
import heroImg from "../assets/Membership_Hero2.png";
import MockUp from "../assets/SG_MockUp.png";

/* Resolve class images from src/assets safely (works in Vite + TS) */
const cyclingUrl  = new URL("../assets/cycling-class.png", import.meta.url).href;
const boxingUrl   = new URL("../assets/boxing-class.jpg", import.meta.url).href;
const yogaUrl     = new URL("../assets/yoga-class.png", import.meta.url).href;
const hiitUrl     = new URL("../assets/hiit-class.png", import.meta.url).href;
const strengthUrl = new URL("../assets/strength-training.png", import.meta.url).href;

export default function MembershipPage() {
  // ---- carousel state/logic (unchanged, just make sure it's inside the component) ----
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const getStep = () => {
    const el = trackRef.current;
    if (!el) return 340;
    const first = el.querySelector<HTMLElement>(".sg-card");
    const gap = parseInt(getComputedStyle(el).getPropertyValue("gap") || "18", 10);
    return (first?.offsetWidth ?? 320) + gap;
  };

  const updateArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scrollByOneCard = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * getStep(), behavior: "smooth" });
  };

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateArrows);
    };
  }, []);

  // ---------------------------
  return (
    <>
      <section
        className="membership-hero full-bleed"
        style={{ backgroundImage: `url(${heroImg})` }}
        aria-label="Membership hero"
      >
        <div className="membership-hero-inner">
          <div className="membership-copy">
            <h1 className="membership-title">Membership that Moves With You</h1>
            <p className="membership-sub">
              Smart Gym gives you the freedom to train, recover, and connect — all in one place.
            </p>
            <Link to="/nonmember/join" className="membership-cta">
              Join Now
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="member-benefits">
          <h1 className="new-members-title">New Member Benefits</h1>
          <p className="new-member-perks">
            <strong>Join Smart Gym today and unlock member perks:</strong>
          </p>
          <ul className="perk-list">
            <li>Complimentary SmartStart fitness assessment</li>
            <li>Free one-on-one Personal Training intro session</li>
            <li>Complimentary Pilates or small-group training class</li>
            <li>25% off your first Recovery Lounge service (sauna, cold plunge, compression)</li>
            <li>Complimentary Gear Fit sizing plus 15% off your first purchase at the Shop</li>
            <li>2 annual guest passes</li>
            <li>Referral rewards when your friends join Smart Gym</li>
          </ul>
        </div>
      </section>

      <section>
        <div className="member-classes">
          <h1 className="classes-title">Signature Classes</h1>
          <br />
          <br />
          <h2 className="classes-sub"><strong>Classes that keep you coming back</strong></h2>
          <p className="class-intro">
            Train with a crew, move with purpose, and leave stronger than you arrived.
            <br />
            Every Smart Gym class is coach-led, beginner-friendly, and bookable in the app. Pick your pace today—your future self will thank you.
          </p>
          <br />
          <br />

          {/* ==== Carousel (namespaced) ==== */}
          <section className="classes sg-classes-carousel" aria-label="Signature Classes">
            <div className="sg-carousel">
              <button
                className="sg-nav sg-prev"
                aria-label="Previous"
                type="button"
                disabled={!canPrev}
                onClick={() => scrollByOneCard(-1)}
              >
                &#10094;
              </button>

              <div className="sg-track" ref={trackRef}>
                <article className="sg-card">
                  <div className="sg-card-media" style={{ backgroundImage: `url(${cyclingUrl})` }} />
                  <div className="sg-card-body">
                    <h3>Cycling</h3>
                    <p>Beat-based rides that are low-impact and high-sweat…</p>
                  </div>
                </article>

                <article className="sg-card">
                  <div className="sg-card-media" style={{ backgroundImage: `url(${boxingUrl})` }} />
                  <div className="sg-card-body">
                    <h3>Boxing</h3>
                    <p>Rounds on the bag plus footwork and combos… (Gloves provided.)</p>
                  </div>
                </article>

                <article className="sg-card">
                  <div className="sg-card-media" style={{ backgroundImage: `url(${yogaUrl})` }} />
                  <div className="sg-card-body">
                    <h3>Yoga</h3>
                    <p>Mobility meets mindfulness. Flow, stretch, and reset…</p>
                  </div>
                </article>

                <article className="sg-card">
                  <div className="sg-card-media" style={{ backgroundImage: `url(${hiitUrl})` }} />
                  <div className="sg-card-body">
                    <h3>HIIT</h3>
                    <p>Short, explosive intervals using kettlebells, ropes, and bodyweight moves…</p>
                  </div>
                </article>

                <article className="sg-card">
                  <div className="sg-card-media" style={{ backgroundImage: `url(${strengthUrl})` }} />
                  <div className="sg-card-body">
                    <h3>Strength Training</h3>
                    <p>Coach-guided lifting with excellent form…</p>
                  </div>
                </article>
              </div>

              <button
                className="sg-nav sg-next"
                aria-label="Next"
                type="button"
                disabled={!canNext}
                onClick={() => scrollByOneCard(1)}
              >
                &#10095;
              </button>
            </div>

            <Link to="/nonmember/classes" className="classes-cta">
              More Info
            </Link>
          </section>
        </div>
      </section>
      <br></br>
      <section>
        <div className="coaching">
          <h1 className="coaching-title">Coaching: The Smart Gym Method</h1>
          <p className="coaching-intro">
            Sometimes you need more than a class—you need a coach.
            At Smart Gym, our certified trainers are here to guide you every step of the way
            <br />
            with programming built around your unique goals, lifestyle, and fitness level. Whether you’re training for your first 5K,
            <br />
            learning proper lifting form, or ready to smash a new PR, our coaches make sure you’re supported and challenged..
          </p>
          <div className="coaching-content">
            <section className="block-why">
          <h2 className="coaching-program">Why Train With Us?</h2>
          <ul className="coaching-train">
            <li><strong>Expert Guidance</strong> – Work with certified professionals who specialize in strength, endurance, mobility, and overall wellness.</li>
            <li><strong>Personalized Programs</strong> – Get workouts tailored to your goals, schedule, and fitness level.</li>
            <li><strong>Motivation & Accountability</strong>– Stay consistent with the support of a trainer who keeps you on track.</li>
            <li><strong>Smarter Progress</strong> – Learn proper form, prevent injuries, and see results faster.</li>
          </ul>
          <h2 className="coaching-program">How It Works</h2>
          <ol className="coaching-trainers">
            <li><strong>Browse Trainers</strong> – Meet our team and learn about their specialties.</li>
            <li><strong>Book Sessions</strong> – Choose from flexible scheduling options to fit your routine.</li>
            <li><strong>Track Results</strong> – Trainers log your progress directly in the Smart Gym app so you can see improvements over time.</li>
          </ol>
          <h2 className="coaching-program">Available Options</h2>
          <ul className="coaching-options">
            <li><strong>One-on-One Training</strong> – Personalized sessions focused on you.</li>
            <li><strong>Small Group Training</strong> – Train with friends or fellow members for extra motivation.</li>
            <li><strong>Specialty Sessions</strong> – Targeted programs like weight loss, strength building, or mobility.</li>
          </ul>
        </section>
        </div>

        <div className="member-portal">
          <h1 className="member-portal-title">Smart Gym in Your Pocket</h1>
          <h2 className="member-portal-sub">Train Smarter, Not Harder</h2>
          <div className="portal-row">
            <div className="app-text-left">
              <h3><strong>Your Gym, Simplified</strong></h3>
              <ul>
                <li>Instant QR check-in</li>
                <li>Book classes anytime</li>
                <li>Order from the cafe on your phone</li>
              </ul>
              <br />
              <br />
              <h3><strong>Stay on Track</strong></h3>
              <ul>
                <li>Track attendance & progress</li>
                <li>Get real-time updates & alerts</li>
                <li>All-in-one fitness hub in your pocket</li>
              </ul>
            </div>
            <img className="app-mockup" src={MockUp} alt="Smart Gym App" />
          </div>
        </div>
        {/* Add closing tag for coaching div */}
        </div>
      </section>
      </>
    );
  }
  

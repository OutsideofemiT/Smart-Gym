import * as React from "react";
import cycling from "../assets/cycling-class.png";
import boxing from "../assets/boxing-class.jpg";
import yoga from "../assets/yoga-class.png";
import hiit from "../assets/hiit-class.png";
import strength from "../assets/strength-training.png";
import "../styles/Classes.css";
import Calendar from "../components/classes/calendar";
import ClassesTabs from "../components/classes/classesTabs";
import ImageCarousel from "../components/classes/ImageCarousel";


const Classes: React.FC = () => {

  const classList = [
    {
      name: "Cycling",
      type: "bike Ride",
      description:
        "A high-energy indoor cycling class designed to improve endurance, burn calories, and strengthen your lower body. Ride to the rhythm of motivating music with guided intervals, climbs, and sprints.",
      img: cycling,
    },
    {
      name: "Boxing",
      type: "Intense Cardio",
      description:
        "High-intensity class combining cardio, strength. Jab, cross, hook your way to fitness.",
      img: boxing,
    },
    {
      name: "Yoga",
      type: "Low to moderate intensity",
      description:
        "A balanced flow to improve flexibility, focus, and mind-body connection.",
      img: yoga,
    },
    {
      name: "HIIT",
      type: "High Intensity interval training",
      description:
        "Fast-paced intervals that build strength, boost endurance, and torch calories.",
      img: hiit,
    },
    {
      name: "Strength Training",
      type: "resistance based weight training",
      description:
        " Full-body training with weights to build muscle and increase power.",
      img: strength,
    },
  ];

  const showCalendar = location.pathname === "/admin/classes";

  return (
    <>
        {/* HERO (fills viewport under fixed navbar, no black band) */}
        <div
          className="classes-hero"
        >
          <ImageCarousel
            classes={classList}
          />
        </div>

        {/* Calendar below the hero */}
        {showCalendar && <Calendar />}

        <ClassesTabs />
    </>
  );
};

export default Classes;

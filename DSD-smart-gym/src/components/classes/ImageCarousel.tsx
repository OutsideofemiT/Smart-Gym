import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import '../../styles/imageCarousel.css'

interface ClassItem {
  img: string;
  name: string;
  type: string;
}

interface ImageCarouselProps {
  classes: ClassItem[];
}

export default function ImageCarousel({ classes }: ImageCarouselProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselImages = classes.map((cls) => [cls.img]);
  const classesName = classes.map((cls) => [cls.name]);
  const classesType = classes.map((cls) => [cls.type]);
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex(
        (prevIndex) => (prevIndex + 1) % carouselImages.length
      );
    }, 3000); // Change image every 3 seconds

    return () => {
      clearInterval(timer); // Clean up the interval on component unmount
    };
  }, [carouselImages.length]); // Re-run effect if the number of images chang
  return (
    <>
      <Box
        sx={{
          width: "100vw",
          height: 600,
          backgroundImage: `url(${carouselImages[currentImageIndex]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "background-image 0.5s ease-in-out", // Optional: smooth transition
        }}
      >
        <h2 className="imageCarouselName">{classesName[currentImageIndex]}</h2>
        <h3 className="imageCarouseltype">{classesType[currentImageIndex]}</h3>

      </Box>
    </>
  );
}

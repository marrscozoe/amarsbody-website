import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMarsBody | Personal Training & Nutrition",
  description: "New Braunfels personal training. Get wedding-ready, beach-body ready, or just stronger. Custom nutrition + fitness plans.",
  verification: {
    google: "2hG3BmQ62hPo9aY-WxL0_LJX6bc5oW1AEi0RYbsgpwk",
  },
};

// Schema.org structured data for GEO/AEO optimization
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemaOrg = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": "https://amarsbody.com/#business",
        name: "AMarsBody",
        description: "Personal training and nutrition coaching in New Braunfels TX. Specializing in event-based fitness - weddings, beach trips, reunions, and photoshoots.",
        url: "https://amarsbody.com",
        email: "amarsbody@gmail.com",
        address: {
          "@type": "PostalAddress",
          streetAddress: "1260 FM1863 BLDG 4",
          addressLocality: "New Braunfels",
          addressRegion: "TX",
          postalCode: "78132",
          addressCountry: "US"
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 29.702,
          longitude: -98.124
        },
        telephone: "",
        priceRange: "$$",
        image: "https://amarsbody.com/logo.svg",
        logo: "https://amarsbody.com/logo.svg",
        amenityFeature: [
          { "@type": "LocationFeatureSpecification", name: "Personal Training", value: true },
          { "@type": "LocationFeatureSpecification", name: "Nutrition Coaching", value: true },
          { "@type": "LocationFeatureSpecification", name: "Online Coaching", value: true }
        ],
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "5",
          reviewCount: "3",
          bestRating: "5",
          worstRating: "1"
        },
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "06:00",
          closes: "20:00"
        },
        sameAs: [
          "https://www.facebook.com/AMarsBody",
          "https://www.instagram.com/amarsbody"
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Training Services",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Event Ready Program",
                description: "12-week focused program for weddings, beach trips, reunions, photoshoots. Event-specific training with nutrition guide and weekly check-ins."
              }
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Personal Training",
                description: "One-on-one personalized training sessions. Custom workouts, form correction, progress tracking."
              }
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Nutrition Coaching",
                description: "Custom meal plans, macro tracking, habit building. Eat to support your goals."
              }
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Online Coaching",
                description: "Remote training with personalized programming and online support."
              }
            }
          ]
        }
      },
      {
        "@type": "FAQPage",
        "@id": "https://amarsbody.com/#faq",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is personal training?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Personal training is one-on-one coaching where I create custom workout programs tailored to your specific goals. Whether you want to lose body fat, build muscle, or get ready for an event, I design the plan and guide you through every session with form checks and progress tracking."
            }
          },
          {
            "@type": "Question",
            name: "How much does personal training cost?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Training programs are customized to your goals and timeline. I offer personal training, nutrition coaching, and online coaching options. Contact me for a free consultation to discuss your specific needs and get a custom plan."
            }
          },
          {
            "@type": "Question",
            name: "Do you offer nutrition coaching?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Nutrition coaching is a core part of my services. I create custom meal plans based on your goals, teach you how to eat for your body, and help you build sustainable habits. No starvation or extreme diets - just proper nutrition that fits your life."
            }
          },
          {
            "@type": "Question",
            name: "What is the Event Ready program?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The Event Ready program is a 12-week focused training and nutrition program designed for people with a specific event coming up - weddings, beach vacations, reunions, photoshoots. It includes event-specific training, a custom nutrition guide, and weekly check-ins to keep you on track."
            }
          },
          {
            "@type": "Question",
            name: "Where are you located?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "I train clients at Eisbar Strength & Fitness, located at 1260 FM1863 BLDG 4, New Braunfels TX 78132. I also offer online coaching for clients who are not local or prefer to train remotely."
            }
          },
          {
            "@type": "Question",
            name: "How long does it take to see results?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Most clients see noticeable changes within 4-6 weeks. For event preparation, I typically recommend 12 weeks for optimal results. The exact timeline depends on your starting point, goals, and how consistently you follow the program."
            }
          },
          {
            "@type": "Question",
            name: "Do I need a gym membership?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "For in-person training, I train clients at Eisbar Strength & Fitness in New Braunfels. If you prefer to train elsewhere or at home, I can design a program that works with your available equipment. I also offer online coaching that doesn't require a gym membership."
            }
          }
        ]
      },
      {
        "@type": "Service",
        "@id": "https://amarsbody.com/#service",
        name: "Personal Training and Nutrition Coaching",
        description: "Personal training and nutrition coaching services in New Braunfels Texas. Specializing in event-based fitness, weight loss, muscle building, and strength training.",
        provider: {
          "@id": "https://amarsbody.com/#business"
        },
        areaServed: {
          "@type": "City",
          name: "New Braunfels"
        },
        serviceType: "Personal Training"
      },
      {
        "@type": "WebSite",
        "@id": "https://amarsbody.com/#website",
        url: "https://amarsbody.com",
        name: "AMarsBody",
        publisher: {
          "@id": "https://amarsbody.com/#business"
        }
      }
    ]
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

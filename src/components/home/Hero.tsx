import { Link } from "react-router-dom";
import { Bottle } from "@/components/ui/Bottle";
import { FlaskIcon, HeartIcon, HourglassIcon } from "@/components/ui/Icons";
import { useProducts } from "@/providers/ProductsProvider";

const DETAILS = [
  { Icon: FlaskIcon, title: "Small-batch craft", body: "Thoughtfully composed, beautifully balanced." },
  { Icon: HourglassIcon, title: "Made to linger", body: "Rich perfume extracts for your everyday ritual." },
  { Icon: HeartIcon, title: "Uniquely yours", body: "Find a fragrance that feels like you." },
];

export function Hero() {
  const { products } = useProducts();
  const front = products[0] ?? { name: "White Oud" };
  const back = products[2] ?? products[1] ?? { name: "Urban Voyage" };

  return (
    <section className="pastel-hero" aria-labelledby="hero-h">
      <div className="hero__bg" aria-hidden="true" />
      <div className="pastel-hero__layout">
        <div className="pastel-hero__copy">
          <p className="pastel-hero__eyebrow">Scent. Soul. Signature.</p>
          <h1 id="hero-h">Fragrance<br />beyond words.</h1>
          <p className="pastel-hero__description">
            Thoughtfully crafted perfume extracts to elevate your everyday.
            Discover a world of rich oud, soft florals, and fresh citrus.
          </p>
          <div className="pastel-hero__actions">
            <Link to="/collection" className="btn btn-primary">Shop the collection <span aria-hidden="true">→</span></Link>
            <Link to="/pages/our-story" className="btn btn-secondary">Discover the house</Link>
          </div>
          <p className="pastel-hero__footnote">Composed slowly. Worn closely. Crafted in India.</p>
        </div>
        <div className="pastel-hero__scene" aria-label="Azelle perfume extracts in lavender and mint glass">
          <div className="pastel-hero__halo" aria-hidden="true" />
          <div className="pastel-hero__orb" aria-hidden="true" />
          <div className="pastel-hero__plinth" aria-hidden="true" />
          <div className="pastel-hero__bottle pastel-hero__bottle--back">
            <Bottle tint="#c3e6d9" name={back.name} decorative className="h-full w-full" />
          </div>
          <div className="pastel-hero__bottle pastel-hero__bottle--front">
            <Bottle tint="#cfb8e9" name={front.name} decorative className="h-full w-full" />
          </div>
          <div className="pastel-hero__badge pastel-hero__badge--top"><span aria-hidden="true">✧</span> A little luxury.<br />Every single day.</div>
          <div className="pastel-hero__badge pastel-hero__badge--bottom"><HeartIcon width={24} height={24} /> Your next<br />signature scent.</div>
        </div>
      </div>
      <ul className="pastel-hero__details">
        {DETAILS.map(({ Icon, title, body }, i) => (
          <li key={title}>
            <span className={`pastel-hero__icon pastel-hero__icon--${i}`}><Icon width={28} height={28} /></span>
            <div><h2>{title}</h2><p>{body}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
}

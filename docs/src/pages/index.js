import React from "react";
import clsx from "clsx";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import styles from "./styles.module.css";

const features = [
  {
    title: "DASH/Smooth Streaming",
    description: (
      <>
        <strong>DASH</strong> and <strong>Smooth</strong> protocol that enables
        high quality streaming of media content over the Internet delivered from
        conventional HTTP web servers.
      </>
    ),
    learnMoreURL: "/docs/api/loadVideo#transport",
  },
  {
    title: "MSE / EME API",
    description: (
      <>
        Relying on the Media Source and Encrypted Media Extensions API that
        enable plugin-free web-based streaming media that are subject to a
        digital restrictions management scheme.
      </>
    ),
    learnMoreURL: "/docs/api/loadVideo#keysystems",
  },
  {
    title: "A featureful player",
    description: (
      <>
        Because the streaming universe is vast and each devices is different,
        the rx-player is strongly customizable with many options.
      </>
    ),
    learnMoreURL: "/docs/api/player_options",
  },
];

const featuresDeep = [
  {
    title: "",
    description: (
      <>
        To play live and On Demand Smooth and DASH contents for extended amounts
        of time, with or without DRM.
      </>
    ),
    backgroundColor: "hsl(231, 12%, 24%)",
    imageUrl: "img/play-button.svg",
    positionImage: "left",
  },
  {
    title: "",
    description: (
      <>
        To offer a first-class user experience (best quality without any
        buffering, low latency...).
      </>
    ),
    backgroundColor: "hsl(231, 12%, 34%)",
    imageUrl: "img/process.svg",
    positionImage: "right",
  },
  {
    title: "",
    description: (
      <>
        To be configurable and extendable (e.g. for Peer-to-Peer streaming, STB
        integration, Smart TV...).
      </>
    ),
    backgroundColor: "hsl(231, 12%, 24%)",
    imageUrl: "img/settings.svg",
    positionImage: "left",
  },
  {
    title: "",
    description: (
      <>To be easy to integrate and use as a library in various codebases.</>
    ),
    backgroundColor: "hsl(231, 12%, 34%)",
    imageUrl: "img/integration.svg",
    positionImage: "right",
  },
];

function Feature({ learnMoreURL, title, description }) {
  return (
    <div className={clsx("col col--4", styles.feature)}>
      <h3>{title}</h3>
      <p>{description}</p>
      <a href={learnMoreURL}>Learn more</a>
    </div>
  );
}

function FeatureDeep({ title, description, imageUrl, positionImage }) {
  const imgUrl = useBaseUrl(imageUrl);
  if (positionImage === "left") {
    return (
      <div className={clsx(styles.featureDeep)}>
        {imgUrl && (
          <div className="text--center">
            <img className={styles.featureImage} src={imgUrl} alt={title} />
          </div>
        )}
        <div className={styles.text}>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
    );
  }
  return (
    <div className={clsx(styles.featureDeep)}>
      <div className={styles.text}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {imgUrl && (
        <div className="text--center">
          <img className={styles.featureImage} src={imgUrl} alt={title} />
        </div>
      )}
    </div>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />"
    >
      <header className={clsx("hero hero--primary", styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">
            {siteConfig.title}, {siteConfig.tagline}
          </h1>
          <div className={styles.buttons}>
            <Link
              className={clsx("button", styles.getStarted)}
              to={useBaseUrl("docs/tutorials/quick_start")}
            >
              GET STARTED
            </Link>
            <iframe
              className={styles.spaceBetween}
              src="https://ghbtns.com/github-btn.html?user=canalplus&repo=rx-player&type=star&count=true&size=large"
              frameborder="0"
              scrolling="0"
              width="170"
              height="30"
              title="GitHub"
            ></iframe>
          </div>
        </div>
      </header>
      <main>
        {features && features.length > 0 && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                {features.map((props, idx) => (
                  <Feature key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
        {featuresDeep.map((props, idx) => (
          <section
            className={`${styles.features} ${styles.deep}`}
            style={{ backgroundColor: props.backgroundColor }}
          >
            <div className="container">
              <div className="row">
                <FeatureDeep key={idx} {...props} />
              </div>
            </div>
          </section>
        ))}
      </main>
    </Layout>
  );
}

export default Home;

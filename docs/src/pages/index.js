import React from "react";
import clsx from "clsx";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import styles from "./styles.module.css";

const features = [
  {
    title: "DASH Streaming",
    description: (
      <>
        Docusaurus was designed from the ground up to be easily installed and
        used to get your website up and running quickly.
      </>
    ),
    learnMoreURL:
      "https://en.wikipedia.org/wiki/Dynamic_Adaptive_Streaming_over_HTTP",
  },
  {
    title: "Smooth Streaming",
    description: (
      <>
        Docusaurus lets you focus on your docs, and we&apos;ll do the chores. Go
        ahead and move your docs into the <code>docs</code> directory.
      </>
    ),
    learnMoreURL:
      "https://en.wikipedia.org/wiki/Adaptive_bitrate_streaming#Microsoft_Smooth_Streaming",
  },
  {
    title: "MSE / EME API",
    description: (
      <>
        Extend or customize your website layout by reusing React. Docusaurus can
        be extended while reusing the same header and footer.
      </>
    ),
    learnMoreURL: "https://google.com",
  },
];

const featuresDeep = [
  {
    title: "Get started instantly",
    description: <>Description ....</>,
    imageUrl: "img/undraw_docusaurus_mountain.svg",
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

function FeatureDeep({ title, description, imageUrl }) {
  const imgUrl = useBaseUrl(imageUrl);
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
              className={clsx(
                "button button--outline button--secondary button--lg",
                styles.getStarted
              )}
              to={useBaseUrl("docs/intro")}
            >
              Get Started
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
        {featuresDeep && featuresDeep.length > 0 && (
          <section className={`${styles.features} ${styles.deep}`}>
            <div className="container">
              <div className="row">
                {featuresDeep.map((props, idx) => (
                  <FeatureDeep key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}

export default Home;

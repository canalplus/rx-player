const React = require("react");

module.exports = ({ title }) =>
  <section className="title-wrapper">
    <h1 className="title">
      <span className="light">{title}</span>
    </h1>
  </section>;

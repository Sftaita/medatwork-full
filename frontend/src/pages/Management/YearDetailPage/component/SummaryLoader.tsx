import ContentLoader from "react-content-loader";

const SummaryLoader = () => {
  return (
    <ContentLoader
      speed={2}
      width={680}
      height={220}
      viewBox="0 0 680 220"
      backgroundColor="#f3f3f3"
      foregroundColor="#ecebeb"
    >
      <rect x="0" y="15" rx="5" ry="5" width="120" height="40" />
      <rect x="150" y="65" rx="5" ry="5" width="440" height="40" />
      <rect x="150" y="440" rx="5" ry="5" width="440" height="40" />
      <rect x="0" y="65" rx="5" ry="5" width="120" height="40" />
      <rect x="0" y="115" rx="5" ry="5" width="120" height="40" />
      <rect x="0" y="165" rx="5" ry="5" width="120" height="40" />
      <rect x="150" y="165" rx="5" ry="5" width="440" height="40" />
      <rect x="150" y="15" rx="5" ry="5" width="440" height="40" />
      <rect x="150" y="115" rx="5" ry="5" width="440" height="40" />
    </ContentLoader>
  );
};

export default SummaryLoader;

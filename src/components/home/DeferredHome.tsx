import HomeLower from "./HomeLower";

/** Keep brand text and discovery links in the document; images remain lazy. */
export function DeferredHome({ catalogueReady: _catalogueReady }: { catalogueReady: boolean }) {
 return <div className="home-lower"><HomeLower /></div>;
}

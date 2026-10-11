import { Link } from "react-router-dom";

export function Breadcrumb({title, flow=false}:{title:string;flow?:boolean}) {
  return <nav aria-label="Breadcrumb" className={`page-breadcrumb ${flow ? "page-breadcrumb--flow" : ""}`}><Link to="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span></nav>;
}

import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoot, RequireAdmin } from "@/admin/AdminLayout";
import { Layout } from "@/components/layout/Layout";
import AccountPage from "@/pages/Account";
import Checkout from "@/pages/Checkout";
import Collection from "@/pages/Collection";
import Home from "@/pages/Home";
import InfoPage from "@/pages/InfoPage";
import NotFound from "@/pages/NotFound";
import OrderPage from "@/pages/Order";
import ProductPage from "@/pages/Product";

// Admin screens are split into their own chunks so the storefront stays light.
const AdminLogin = lazy(() => import("@/admin/pages/AdminLogin"));
const AdminProducts = lazy(() => import("@/admin/pages/AdminProducts"));
const AdminProductForm = lazy(() => import("@/admin/pages/AdminProductForm"));

export default function App() {
  return (
    <Routes>
      <Route path="admin" element={<AdminRoot />}>
        <Route index element={<Navigate to="products" replace />} />
        <Route path="login" element={<AdminLogin />} />
        <Route element={<RequireAdmin />}>
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductForm key="new" />} />
          <Route path="products/:id/edit" element={<AdminProductForm />} />
        </Route>
        <Route path="*" element={<Navigate to="products" replace />} />
      </Route>

      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="collection" element={<Collection />} />
        <Route path="product/:slug" element={<ProductPage />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order/:id" element={<OrderPage />} />
        <Route path="pages/:slug" element={<InfoPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

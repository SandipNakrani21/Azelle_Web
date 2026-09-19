import { lazy, Suspense } from "react";
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
const AdminDashboard = lazy(() => import("@/admin/pages/AdminDashboard"));
const AdminOrders = lazy(() => import("@/admin/pages/AdminOrders"));
const AdminOrderDetail = lazy(() => import("@/admin/pages/AdminOrderDetail"));
const AdminCustomers = lazy(() => import("@/admin/pages/AdminCustomers"));
const AdminCoupons = lazy(() => import("@/admin/pages/AdminCoupons"));
const AdminSettings = lazy(() => import("@/admin/pages/AdminSettings"));
const AdminReviews = lazy(() => import("@/admin/pages/AdminReviews"));
const MockPayment = lazy(() => import("@/pages/MockPayment"));

export default function App() {
  return (
    <Routes>
      <Route path="admin" element={<AdminRoot />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="login" element={<AdminLogin />} />
        <Route element={<RequireAdmin />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductForm key="new" />} />
          <Route path="products/:id/edit" element={<AdminProductForm />} />
        </Route>
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Local test-mode payment page (dummy gateway keys only). */}
      <Route path="mock-payment/:id" element={<Suspense fallback={null}><MockPayment /></Suspense>} />

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

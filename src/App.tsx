import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminHome, AdminRoot, RequireAdmin, RequirePermission as Can } from "@/admin/AdminLayout";
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
const AdminClarityDashboard = lazy(() => import("@/admin/pages/AdminClarityDashboard"));
const AdminUsers = lazy(() => import("@/admin/pages/AdminUsers"));
const AdminAccess = lazy(() => import("@/admin/pages/AdminAccess"));
const MockPayment = lazy(() => import("@/pages/MockPayment"));

export default function App() {
  return (
    <Routes>
      <Route path="admin" element={<AdminRoot />}>
        <Route path="login" element={<AdminLogin />} />
        {/* Every page checks the signed-in admin's role (RBAC); the server checks again. */}
        <Route element={<RequireAdmin />}>
          <Route index element={<AdminHome />} />
          <Route path="dashboard" element={<Can perm="dashboard.view"><AdminDashboard /></Can>} />
          <Route path="dashboard/clarity" element={<Can perm="analytics.view"><AdminClarityDashboard /></Can>} />
          <Route path="orders" element={<Can perm="orders.view"><AdminOrders /></Can>} />
          <Route path="orders/:id" element={<Can perm="orders.view"><AdminOrderDetail /></Can>} />
          <Route path="customers" element={<Can perm="customers.view"><AdminCustomers /></Can>} />
          <Route path="coupons" element={<Can perm="coupons.view"><AdminCoupons /></Can>} />
          <Route path="reviews" element={<Can perm="reviews.view"><AdminReviews /></Can>} />
          <Route path="settings" element={<Can perm="settings.view"><AdminSettings /></Can>} />
          <Route path="users" element={<Can perm="users.view"><AdminUsers view="users" /></Can>} />
          <Route path="roles" element={<Can perm="roles.view"><AdminUsers view="roles" /></Can>} />
          <Route path="access" element={<Can perm={["users.view", "roles.view"]}><AdminAccess /></Can>} />
          <Route path="products" element={<Can perm="products.view"><AdminProducts /></Can>} />
          <Route path="products/new" element={<Can perm="products.add"><AdminProductForm key="new" /></Can>} />
          <Route path="products/:id/edit" element={<Can perm="products.update"><AdminProductForm /></Can>} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
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

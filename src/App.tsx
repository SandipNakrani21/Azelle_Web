import { Seo } from "./components/layout/Seo";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import Home from "@/pages/Home";

// Load checkout, product details and admin code only when their routes are opened.
const RecoveryPage = lazy(() => import("@/pages/Recovery"));
const AdminSupport = lazy(() => import("@/admin/pages/AdminSupport"));
const AccountPage = lazy(() => import("@/pages/Account"));
const Checkout = lazy(() => import("@/pages/Checkout"));
import Collection from "@/pages/Collection";
import InfoPage from "@/pages/InfoPage";
import NotFound from "@/pages/NotFound";
const OrderPage = lazy(() => import("@/pages/Order"));
import ProductPage from "@/pages/Product";
const WishlistPage = lazy(() => import("@/pages/Wishlist"));
const HomeNew = lazy(() => import("@/pages/HomeNew"));
const AdminRoot = lazy(() => import("@/admin/AdminLayout").then((module) => ({ default: module.AdminRoot })));
const AdminHome = lazy(() => import("@/admin/AdminLayout").then((module) => ({ default: module.AdminHome })));
const RequireAdmin = lazy(() => import("@/admin/AdminLayout").then((module) => ({ default: module.RequireAdmin })));
const Can = lazy(() => import("@/admin/AdminLayout").then((module) => ({ default: module.RequirePermission })));

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
const AdminVisitors = lazy(() => import("@/admin/pages/AdminVisitors"));
const AdminAnnouncements = lazy(() => import("@/admin/pages/AdminAnnouncements"));
const AdminUsers = lazy(() => import("@/admin/pages/AdminUsers"));
const AdminAccess = lazy(() => import("@/admin/pages/AdminAccess"));
const MockPayment = lazy(() => import("@/pages/MockPayment"));

export default function App() {
  return (
    <Suspense fallback={<div role="status" className="grid min-h-[60vh] place-items-center pt-24 text-soft">Loading page…</div>}>
    <Seo />
    <Routes>
      <Route path="admin" element={<AdminRoot />}>
        <Route path="login" element={<AdminLogin />} />
        {/* Every page checks the signed-in admin's role (RBAC); the server checks again. */}
        <Route element={<RequireAdmin />}>
          <Route index element={<AdminHome />} />
          <Route path="dashboard" element={<Can perm="dashboard.view"><AdminDashboard /></Can>} />
          <Route path="dashboard/clarity" element={<Can perm="analytics.view"><AdminClarityDashboard /></Can>} />
          <Route path="visitors" element={<Can perm="visitors.view"><AdminVisitors /></Can>} />
          <Route path="orders" element={<Can perm="orders.view"><AdminOrders /></Can>} />
          <Route path="orders/:id" element={<Can perm="orders.view"><AdminOrderDetail /></Can>} />
          <Route path="support" element={<Can perm="customers.view"><AdminSupport /></Can>} />
          <Route path="customers" element={<Can perm="customers.view"><AdminCustomers /></Can>} />
          <Route path="coupons" element={<Can perm="coupons.view"><AdminCoupons /></Can>} />
          <Route path="announcements" element={<Can perm="announcements.view"><AdminAnnouncements /></Can>} />
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
        <Route path="homenew" element={<HomeNew />} />
        <Route path="collection" element={<Collection />} />
        <Route path="product/:slug" element={<ProductPage />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order/:id" element={<OrderPage />} />
        <Route path="pages/:slug" element={<InfoPage />} />
        <Route path="forgot-password" element={<RecoveryPage />} />
        <Route path="reset-password" element={<RecoveryPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="wishlist" element={<WishlistPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  );
}

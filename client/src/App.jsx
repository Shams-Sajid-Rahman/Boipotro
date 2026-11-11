import { Component } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute, { GuestOnlyRoute } from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import ShopPage from './pages/ShopPage.jsx';
import BookDetailsPage from './pages/BookDetailsPage.jsx';
import SellPage from './pages/SellPage.jsx';
import MyListingsPage from './pages/MyListingsPage.jsx';
import OffersPage from './pages/OffersPage.jsx';
import WishlistPage from './pages/WishlistPage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import AdminPage from './pages/admin/AdminPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import NotFoundPage, { CrashPage } from './pages/NotFoundPage.jsx';

/** Catches render errors so one broken page doesn't blank the whole app. */
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info.componentStack);
  }

  componentDidUpdate(prev) {
    // Navigating away clears the error.
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    return this.state.error ? <CrashPage onReset={() => this.setState({ error: null })} /> : this.props.children;
  }
}

export default function App() {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="books/:id" element={<BookDetailsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />

          <Route element={<GuestOnlyRoute />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="sell" element={<SellPage />} />
            <Route path="listings/:id/edit" element={<SellPage />} />
            <Route path="my-listings" element={<MyListingsPage />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

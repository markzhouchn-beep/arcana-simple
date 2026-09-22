import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Draw from './pages/Draw.jsx';
import Cards from './pages/Cards.jsx';
import CardDetail from './pages/CardDetail.jsx';
import Pay from './pages/Pay.jsx';
import Me from './pages/Me.jsx';
import Login from './pages/Login.jsx';
import AdminLogin from './pages/admin/Login.jsx';
import AdminOrders from './pages/admin/Orders.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/draw" element={<Draw/>}/>
      <Route path="/cards" element={<Cards/>}/>
      <Route path="/cards/:slug" element={<CardDetail/>}/>
      <Route path="/pay" element={<Pay/>}/>
      <Route path="/me" element={<Me/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/admin" element={<AdminLogin/>}/>
      <Route path="/admin/orders" element={<AdminOrders/>}/>
      <Route path="*" element={<Navigate to="/"/>}/>
    </Routes>
  </BrowserRouter>);

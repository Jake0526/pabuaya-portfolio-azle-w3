import { useState } from 'react'
import { BrowserRouter, Route, Routes } from "react-router-dom"

import HomePageComponent from "./component/home/HomeComponent"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePageComponent />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

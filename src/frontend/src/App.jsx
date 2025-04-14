import { useState } from 'react'
import { BrowserRouter, Route, Routes } from "react-router-dom"

import HomePageComponent from "./component/home/HomeComponent"
import TimeCapsultComponent from "./component/time-capsule/TimeCapsuleComponent"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePageComponent />} />
        <Route path="/time-capsule" element={<TimeCapsultComponent />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

async function testApi() {
  const res = await fetch('http://localhost:5000/api/participants/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Muhammed Nihal',
      phone: '9847001122',
      address: 'Town Bypass, Valanchery',
      location: 'Valanchery',
      couponId: '7492018404',
    }),
  })
  const data = await res.json()
  console.log('Registration response from MongoDB Atlas:', data)

  // Validate coupon is now used
  const couponCheck = await fetch('http://localhost:5000/api/coupons/validate/7492018404')
  console.log('Coupon validation after use:', await couponCheck.json())

  // Lookup pass
  const lookup = await fetch('http://localhost:5000/api/participants/lookup/9847001122')
  console.log('Participant pass lookup:', await lookup.json())
}

testApi()

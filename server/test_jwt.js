import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test';
const userPayload = { username: 'test', role: 'user' };

try {
  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7m' });
  console.log("Token with 7m:", token);
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("Verification failed for 7m:", err.message);
    } else {
      console.log("Verification successful for 7m. Exp:", new Date(decoded.exp * 1000));
    }
  });
} catch (e) {
  console.log("Error signing with 7m:", e.message);
}

try {
  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7m' });
  console.log("Token with 7m:", token);
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("Verification failed for 7m:", err.message);
    } else {
      console.log("Verification successful for 7m. Exp:", new Date(decoded.exp * 1000));
    }
  });
} catch (e) {
  console.log("Error signing with 7m:", e.message);
}

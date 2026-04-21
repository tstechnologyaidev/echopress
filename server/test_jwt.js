import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test';
const userPayload = { username: 'test', role: 'user' };

try {
  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7yr' });
  console.log("Token with 7yr:", token);
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("Verification failed for 7yr:", err.message);
    } else {
      console.log("Verification successful for 7yr. Exp:", new Date(decoded.exp * 1000));
    }
  });
} catch (e) {
  console.log("Error signing with 7yr:", e.message);
}

try {
  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7y' });
  console.log("Token with 7y:", token);
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("Verification failed for 7y:", err.message);
    } else {
      console.log("Verification successful for 7y. Exp:", new Date(decoded.exp * 1000));
    }
  });
} catch (e) {
  console.log("Error signing with 7y:", e.message);
}


import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [name, setName] = useState('');
  const [hobby, setHobby] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/save', { name, hobby }); // proxy to backend
      setMessage(res.data.message);
    } catch (err) {
      setMessage('Failed to save data');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Save Hobby to RDS</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          placeholder="Hobby"
          value={hobby}
          onChange={e => setHobby(e.target.value)}
          required
        />
        <button type="submit">Submit</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default App;

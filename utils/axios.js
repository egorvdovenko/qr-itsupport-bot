const axios = require('axios');
const { API_URL } = require('../config');

let token = null;
let refreshToken = null;

/**
 * Sets the authentication token.
 * @param {string} newToken - The new authentication token.
 */
function setToken(newToken) {
  token = newToken;
}

/**
 * Sets the refresh token used for authentication.
 * @param {string} newRefreshToken - The new refresh token.
 */
function setRefreshToken(newRefreshToken) {
  refreshToken = newRefreshToken;
}

axios.interceptors.request.use(
  /**
   * Interceptor function to modify the request config before sending the request.
   * @param {Object} config - The request config.
   * @returns {Object} - The modified request config.
   */
  (config) => {
    config.headers.Authorization = `Bearer ${token}`;
    
    return config;
  },
  /**
   * Interceptor function to handle request errors.
   * @param {Error} error - The request error.
   * @returns {Promise} - A rejected Promise with the error.
   */
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  /**
   * Interceptor function to handle successful responses.
   * @param {Object} response - The response object.
   * @returns {Object} - The response object.
   */
  (response) => {
    return response;
  },
  /**
   * Interceptor function to handle response errors.
   * @param {Error} error - The response error.
   * @returns {Promise} - A rejected Promise with the error.
   */
  async (error) => {
    const { response } = error;

    if (response && response.status === 401) {
      if (token && refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token, refreshToken })
          });
          const data = await refreshResponse.json();
          token = data.token;
          refreshToken = data.refreshToken;

          error.config.headers.Authorization = `Bearer ${token}`;
          return axios.request(error.config);
        } catch (error) {
          return Promise.reject(error);
        }
      }
    }

    return Promise.reject(error);
  }
);

module.exports = { 
  axios, 
  setToken, 
  setRefreshToken 
};

// Local storage utilities for guest system
export const generateGuestUsername = (): string => {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
};

export const getGuestUsername = (): string => {
  let username = localStorage.getItem('snapmap_guest_username');
  if (!username) {
    username = generateGuestUsername();
    localStorage.setItem('snapmap_guest_username', username);
  }
  return username;
};

export const setGuestUsername = (username: string): void => {
  localStorage.setItem('snapmap_guest_username', username);
};
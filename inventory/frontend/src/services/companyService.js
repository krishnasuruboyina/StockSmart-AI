import api from "./api";

export async function getCompany() {
  const response = await api.get("/companies/me");
  return response.data;
}

export async function updateCompany(data) {
  const response = await api.put("/companies/me", data);
  return response.data;
}
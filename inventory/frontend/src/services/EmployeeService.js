import api from "./api";

export async function getEmployees() {
  const response = await api.get("/employees");
  return response.data;
}

export async function addEmployee(data) {
  const response = await api.post("/employees", data);
  return response.data;
}

export async function updateEmployee(id, data) {
  const response = await api.put(`/employees/${id}`, data);
  return response.data;
}

export async function deleteEmployee(id) {
  const response = await api.delete(`/employees/${id}`);
  return response.data;
}
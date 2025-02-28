import axios, { AxiosRequestConfig } from 'axios'

export class Request {
  constructor(private baseURL: string) {
    this.baseURL = baseURL
  }
  async get<T = any>(url: string, config: AxiosRequestConfig) {
    const response = await axios.get(this.baseURL + url, config)
    return response.data as T
  }
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await axios.post(this.baseURL + url, data, config)
    return response.data as T
  }
}

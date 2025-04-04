import axios, { AxiosRequestConfig } from 'axios'
import { sleep } from '../../utils/common'

const executeWithRetry = async <T>(
  callback: () => Promise<T>,
  retry: number = 3
) => {
  for (let i = 1; i <= retry; i++) {
    try {
      const res = await callback()
      return res as T
    } catch (error: any) {
      if (i === retry || error.response.status === 401) throw error
      console.log(error.response)
      console.log(`Retry ${i}/${retry} ${error.message} `)
      await sleep(Math.random() * 3)
    }
  }
  throw new Error('Request failed')
}
export class Request {
  constructor(private baseURL: string) {
    this.baseURL = baseURL
  }
  async get<T = any>(url: string, config: AxiosRequestConfig) {
    const response = await executeWithRetry<T>(async () => {
      const res = await axios.get(this.baseURL + url, config)
      return res.data as T
    })
    return response
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await executeWithRetry<T>(async () => {
      const res = await axios.post(this.baseURL + url, data, config)
      return res.data as T
    })
    return response
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await executeWithRetry<T>(async () => {
      const res = await axios.put(this.baseURL + url, data, config)
      return res.data as T
    })
    return response
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await executeWithRetry<T>(async () => {
      const res = await axios.delete(this.baseURL + url, config)
      return res.data as T
    })
    return response
  }
}

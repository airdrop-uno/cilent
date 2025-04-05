import axios, { AxiosRequestConfig } from 'axios'
import { sleep } from '../../utils/common'

const executeWithRetry = async <T>(
  callback: () => Promise<T>,
  retry: number = 1
) => {
  for (let i = 1; i <= retry; i++) {
    try {
      const res = await callback()
      return res as T
    } catch (error: any) {
      console.log(error.response.data)
      if (
        i === retry ||
        error.response?.status === 401 ||
        error.response?.data?.message?.includes('expired token.')
      )
        throw error
      console.log(
        `Retry ${i}/${retry} ${error.message} ${JSON.stringify(error.response.data)}`
      )
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
      const res = await axios.get(this.baseURL + url, {
        ...config,
        timeout: 60 * 3 * 1000
      })
      return res.data as T
    })
    return response
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    retry?: number
  ): Promise<T> {
    const response = await executeWithRetry<T>(async () => {
      const res = await axios.post(this.baseURL + url, data, {
        ...config,
        timeout: 60 * 3 * 1000
      })
      return res.data as T
    }, retry)
    return response
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    retry?: number
  ): Promise<T> {
    const response = await executeWithRetry<T>(async () => {
      const res = await axios.put(this.baseURL + url, data, {
        ...config,
        timeout: 60 * 3 * 1000
      })
      return res.data as T
    }, retry)
    return response
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    retry?: number
  ): Promise<T> {
    const response = await executeWithRetry<T>(async () => {
      const res = await axios.delete(this.baseURL + url, {
        ...config,
        timeout: 60 * 3 * 1000
      })
      return res.data as T
    }, retry)
    return response
  }
}

import _axios from 'axios'

const baseURL = 'http://127.0.0.1:54345'

const axios = _axios.create({
  baseURL,
  timeout: 0
})

axios.interceptors.response.use(
  (response) => {
    if (response.status === 200 && response.data.status === 'success') {
      return response.data.data
    } else {
      console.log('请求失败，检查网络')
    }
  },
  (error) => {
    console.error('请求失败了')
    return Promise.reject(error)
  }
)

export const request = async <T = any>(
  url: string,
  data?: unknown
): Promise<T> => {
  const res = await axios({ method: 'post', url, data })
  return res as T
}
export const getBrowserList = async () => {
  const res = await request('/browser/list', { page: 0, pageSize: 100 })
  return res.list
}
export const getHeadBrowser = async () => {}

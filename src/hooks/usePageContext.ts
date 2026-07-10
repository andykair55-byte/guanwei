import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTraeBotStore, type PageContext } from '../stores/traeBotStore'

// 在内容页面调用，注入页面上下文给trae宝
export function usePageContext(context: Omit<PageContext, 'url'> | null) {
  const setPageContext = useTraeBotStore(s => s.setPageContext)
  const location = useLocation()

  useEffect(() => {
    if (context) {
      setPageContext({
        type: context.type,
        title: context.title,
        content: context.content.slice(0, 2000), // 截断到2000字
        url: location.pathname,
      })
    } else {
      setPageContext(null)
    }
    return () => {
      setPageContext(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.title, context?.content, location.pathname])
}

import React, { useEffect, useState, useRef } from 'react';
import type { Item } from '@/types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { env } from '@/config/env';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort } from '@fortawesome/free-solid-svg-icons';

const ListPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 50;
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedAuthor, setSelectedAuthor] = useState<string>('');

  // 年・月を分離
  const thisYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(thisYear); // 既定は今年
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // 既定は「すべて」

  const [authors, setAuthors] = useState<string[]>([]);
  const [months, setMonths] = useState<string[]>([]); // "YYYY-MM" の配列想定
  const [years, setYears] = useState<string[]>([]);   // months から抽出

  const [searchTitleInput, setSearchTitleInput] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [searchKeywordInput, setSearchKeywordInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const titleDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keywordDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // タイトル入力の監視（1秒デバウンス）
  useEffect(() => {
    if (titleDebounceTimer.current) clearTimeout(titleDebounceTimer.current);
    titleDebounceTimer.current = setTimeout(() => {
      setSearchTitle(searchTitleInput);
      setPage(1);
    }, 1000);
    return () => {
      if (titleDebounceTimer.current) clearTimeout(titleDebounceTimer.current);
    };
  }, [searchTitleInput]);

  // キーワード入力の監視（1秒デバウンス）
  useEffect(() => {
    if (keywordDebounceTimer.current) clearTimeout(keywordDebounceTimer.current);
    keywordDebounceTimer.current = setTimeout(() => {
      setSearchKeyword(searchKeywordInput);
      setPage(1);
    }, 1000);
    return () => {
      if (keywordDebounceTimer.current) clearTimeout(keywordDebounceTimer.current);
    };
  }, [searchKeywordInput]);

  // 一覧取得（year/month を分けて送る）
  useEffect(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      author: selectedAuthor,
      year: selectedYear,        // ←年
      month: selectedMonth,      // ←"01"〜"12" or ''（すべて）
      title: searchTitle,
      keyword: searchKeyword,
      sort: sortOrder,
    });

    fetch(`${env.apiUrl}/list.php?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setItems(data.items || []);
          setTotal(data.total || 0);
        }
      })
      .catch((err) => {
        console.error('一覧取得エラー:', err);
      });
  }, [page, selectedAuthor, selectedYear, selectedMonth, searchTitle, searchKeyword, sortOrder]);

  // フィルター情報取得（authors / months）
  useEffect(() => {
    fetch(`${env.apiUrl}/filter_options.php`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAuthors(data.authors || []);
          const m = (data.months || []) as string[]; // "YYYY-MM" 想定
          setMonths(m);

          // ユニーク年を抽出して降順に
          const ys = Array.from(new Set(m.map((s) => s.slice(0, 4)))).sort().reverse();
          setYears(ys);

          // 取得データに今年がなければ年フィルタは「すべて」にフォールバック
          if (!ys.includes(thisYear)) {
            setSelectedYear('');
          }
        }
      })
      .catch((err) => {
        console.error('フィルター情報取得エラー:', err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ページ計算（最大7件ウィンドウ）
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const windowSize = 7;
  const half = Math.floor(windowSize / 2);

  let start = Math.max(1, page - half);
  let end = start + windowSize - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - windowSize + 1);
  }
  const pageRange = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  // totalが減って今のpageが範囲外になったら最終ページへ丸める保険
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages]); // eslint-disable-line react-hooks/exhaustive-deps

  // 選択された年に属する月だけを候補に出す
  const monthsForSelectedYear = selectedYear
    ? months.filter((m) => m.startsWith(`${selectedYear}-`)).map((m) => m.slice(5, 7)) // "MM"
    : Array.from(new Set(months.map((m) => m.slice(5, 7)))).sort(); // 年未選択なら全月ユニーク

  return (
    <div className="wrap page-list">
      <Header />
      <div className="main">
        <div className="sort flex items-center gap-10 mb-20 fsz-13">
          {/* 案件名検索 */}
          <div className="search flex items-center gap-5">
            <input
              type="text"
              placeholder="案件名"
              value={searchTitleInput}
              onChange={(e) => setSearchTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchTitle(searchTitleInput);
                  setPage(1);
                }
              }}
              className="title-search"
            />
          </div>

          {/* 修正内容検索 */}
          <div className="search flex items-center gap-5">
            <input
              type="text"
              placeholder="修正内容"
              value={searchKeywordInput}
              onChange={(e) => setSearchKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchKeyword(searchKeywordInput);
                  setPage(1);
                }
              }}
              className="title-search"
            />
          </div>

          {/* 作成者フィルタ */}
          <select
            value={selectedAuthor}
            onChange={(e) => {
              setSelectedAuthor(e.target.value);
              setPage(1);
            }}
            className="author-filter"
          >
            <option value="">すべての作成者</option>
            {authors.map((author) => (
              <option key={author} value={author}>
                {author}
              </option>
            ))}
          </select>

          {/* 年フィルタ（既定: 今年。存在しなければ「すべて」） */}
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedMonth(''); // 年を変えたら月は「すべて」に戻す
              setPage(1);
            }}
            className="year-filter"
          >
            <option value="">すべての年</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>

          {/* 月フィルタ（MM）。年が選ばれていればその年の月のみ */}
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setPage(1);
            }}
            className="month-filter"
          >
            <option value="">すべての月</option>
            {monthsForSelectedYear.map((mm) => {
              const mNum = parseInt(mm, 10); // "08" → 8
              return (
                <option key={`${selectedYear || 'all'}-${mm}`} value={mm}>
                  {mNum}月
                </option>
              );
            })}
          </select>

          {/* 並び順 */}
          <div
            className="flex items-center gap-5 pointer"
            onClick={() => {
              setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              setPage(1);
            }}
          >
            <FontAwesomeIcon icon={faSort} />
            <span className="fsz-11">{sortOrder === 'asc' ? '古い順' : '新しい順'}</span>
          </div>

          <div className="fsz-14 text-gray mb-2 ml-auto mr-10">{total}件</div>
        </div>

        <ul className="card-list">
          {items.map((item) => (
            <li className="card-list__item" key={item.id}>
              <a href={`${env.appUrl}/${item.id}`} className="card-list__item-inner">
                <div className="card-list__image mb-5">
                  {item.image ? (
                    (() => {
                      const date = new Date(item.created_at);
                      const Y = date.getFullYear().toString();
                      const mm = ('0' + (date.getMonth() + 1)).slice(-2);
                      const src = `${env.serverUrl}/uploads/${Y}/${mm}/${item.id}/${item.image}`;
                      return (
                        <img
                          src={src}
                          alt=""
                          className="object-fit object-cover object-top rounded"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.onerror = null;
                            img.style.display = 'none';
                            const fallback = document.createElement('div');
                            fallback.textContent = '(˙◁˙)';
                            fallback.className = 'text-lightgray fsz-20';
                            img.parentNode?.appendChild(fallback);
                          }}
                        />
                      );
                    })()
                  ) : (
                    <div className="text-lightgray fsz-20">(·_·)</div>
                  )}
                </div>
                <div className="card-list__bottom">
                  <div className="mb-5 fsz-14">{item.title}</div>
                  <div className="card-list__info mt-10 fsz-10">
                    <div className="text-gray text-right">{item.created_by}</div>
                    <div className="text-gray text-right">{item.created_at}</div>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>

        {/* ページネーション（7件ウィンドウ＋前後） */}
        <div className="pagination mt-20">
          <button
            type="button"
            className={`page-button ${page === 1 ? 'is-disabled' : ''}`}
            onClick={() => page > 1 && setPage(page - 1)}
            disabled={page === 1}
            aria-label="前のページ"
          >
            &lt;
          </button>

          {pageRange.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setPage(p)}
              className={`page-button ${page === p ? 'is-current' : ''}`}
              aria-current={page === p ? 'page' : undefined}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            className={`page-button ${page === totalPages ? 'is-disabled' : ''}`}
            onClick={() => page < totalPages && setPage(page + 1)}
            disabled={page === totalPages}
            aria-label="次のページ"
          >
            &gt;
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ListPage;

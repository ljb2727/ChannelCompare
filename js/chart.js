export class ChartManager {
    constructor() {
        this.radarChart = null;
        this.contentTypeChart = null;
        this.lengthVsViewsChart = null;
        this.growthTrendChart = null;
    }

    // 2. Radar Chart 렌더링
    renderRadarChart(radarDataList) {
        const ctx = document.getElementById('radarChart');
        if (!ctx) return;

        if (this.radarChart) this.radarChart.destroy();

        // 모든 채널의 데이터셋 준비
        const labels = ['구독자 규모', '조회수 파워', '영상 수', '참여도', '최근 성과'];
        const colors = [
            { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 1)' },
            { bg: 'rgba(139, 92, 246, 0.2)', border: 'rgba(139, 92, 246, 1)' },
            { bg: 'rgba(236, 72, 153, 0.2)', border: 'rgba(236, 72, 153, 1)' },
            { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 1)' },
            { bg: 'rgba(251, 191, 36, 0.2)', border: 'rgba(251, 191, 36, 1)' }
        ];

        const datasets = radarDataList.map((data, index) => {
            const color = colors[index % colors.length];
            return {
                label: data.channelTitle,
                data: Object.values(data.scores),
                backgroundColor: color.bg,
                borderColor: color.border,
                borderWidth: 2,
                pointBackgroundColor: color.border,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: color.border
            };
        });

        this.radarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        beginAtZero: true,
                        ticks: {
                            stepSize: 20,
                            color: '#94a3b8',
                            backdropColor: 'transparent'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        pointLabels: {
                            color: '#f8fafc',
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#f8fafc',
                            padding: 15,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${context.parsed.r.toFixed(1)}점`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 7. Video Length vs Views Scatter Chart 렌더링
    renderLengthVsViewsChart(analyzedData) {
        const ctx = document.getElementById('lengthVsViewsChart');
        if (!ctx) return;

        if (this.lengthVsViewsChart) this.lengthVsViewsChart.destroy();

        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#fbbf24'];
        
        const datasets = analyzedData.map((data, index) => {
            const points = data.videos.map(video => {
                const durationSec = this.parseDuration(video.contentDetails?.duration);
                const views = parseInt(video.statistics.viewCount || 0);
                return {
                    x: (durationSec / 60).toFixed(1), // 분 단위
                    y: views,
                    title: video.snippet.title, // 툴팁용
                    videoId: video.id // 링크 이동용
                };
            }).filter(p => p.y > 0 && p.x > 0); // 유효한 데이터만

            return {
                label: data.metrics.channelTitle,
                data: points,
                backgroundColor: colors[index % colors.length],
                borderColor: colors[index % colors.length],
                pointRadius: 5,
                pointHoverRadius: 7
            };
        });

        this.lengthVsViewsChart = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: '영상 길이 (분)',
                            color: '#94a3b8'
                        },
                        ticks: {
                            color: '#f8fafc'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        type: 'logarithmic', // 조회수 차이가 크므로 로그 스케일 사용
                        title: {
                            display: true,
                            text: '조회수 (로그 스케일)',
                            color: '#94a3b8'
                        },
                        ticks: {
                            color: '#f8fafc',
                            callback: (value) => {
                                if (value === 1000 || value === 10000 || value === 100000 || value === 1000000 || value === 10000000) {
                                    return this.formatNumber(value);
                                }
                                return null;
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#f8fafc'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const point = context.raw;
                                return `${point.title.substring(0, 20)}... (${point.x}분, ${this.formatNumber(point.y)}회)`;
                            }
                        }
                    }
                },
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const element = elements[0];
                        const datasetIndex = element.datasetIndex;
                        const index = element.index;
                        const videoId = this.lengthVsViewsChart.data.datasets[datasetIndex].data[index].videoId;
                        if (videoId) {
                            window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
                        }
                    }
                }
            }
        });
    }

    // ISO 8601 duration 파싱 (헬퍼 함수)
    parseDuration(duration) {
        if (!duration) return 0;
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        const seconds = parseInt(match[3] || 0);
        return hours * 3600 + minutes * 60 + seconds;
    }

    // 4. Upload Pattern Heatmap 렌더링
    renderHeatmaps(heatmapDataList) {
        const container = document.getElementById('heatmapContainer');
        if (!container) return;

        container.innerHTML = '';

        const colors = [
            '#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#fbbf24'
        ];

        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        heatmapDataList.forEach((data, index) => {
            const color = colors[index % colors.length];
            const channelDiv = document.createElement('div');
            channelDiv.className = 'channel-heatmap';

            // 채널명 레이블
            const label = document.createElement('div');
            label.className = 'heatmap-label';
            label.innerHTML = `
                <div style="width: 12px; height: 12px; background: ${color}; border-radius: 2px;"></div>
                <span>${data.channelTitle}</span>
            `;

            // 요일 패턴
            const daySection = document.createElement('div');
            daySection.style.marginTop = '0.5rem';
            daySection.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">요일별 업로드</div>';
            
            const dayGrid = document.createElement('div');
            dayGrid.className = 'heatmap-day-grid';
            
            data.pattern.days.forEach((intensity, dayIndex) => {
                const dayCell = document.createElement('div');
                dayCell.className = 'heatmap-day-cell';
                
                const opacity = 0.1 + (intensity * 0.9);
                dayCell.style.backgroundColor = this.hexToRgba(color, opacity);
                dayCell.innerHTML = `<div class="day-label">${dayNames[dayIndex]}</div>`;
                dayCell.setAttribute('data-tooltip', `${dayNames[dayIndex]}요일: ${Math.round(intensity * 100)}%`);
                
                dayGrid.appendChild(dayCell);
            });

            // 시간대 패턴
            const hourSection = document.createElement('div');
            hourSection.style.marginTop = '0.75rem';
            hourSection.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">시간대별 업로드</div>';
            
            const hourGrid = document.createElement('div');
            hourGrid.className = 'heatmap-grid';

            data.pattern.hours.forEach((intensity, hour) => {
                const cell = document.createElement('div');
                cell.className = 'heatmap-cell';
                
                // 투명도로 강도 표현
                const opacity = 0.1 + (intensity * 0.9);
                cell.style.backgroundColor = this.hexToRgba(color, opacity);
                cell.setAttribute('data-tooltip', `${hour}시: ${Math.round(intensity * 100)}%`);
                
                hourGrid.appendChild(cell);
            });

            channelDiv.appendChild(label);
            channelDiv.appendChild(daySection);
            channelDiv.appendChild(dayGrid);
            channelDiv.appendChild(hourSection);
            channelDiv.appendChild(hourGrid);
            container.appendChild(channelDiv);
        });
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // 5. Best Videos 렌더링 (컴팩트 스타일)
    renderBestVideos(bestVideos) {
        const container = document.getElementById('bestVideosContainer');
        if (!container) return;

        container.innerHTML = '';
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#fbbf24'];

        bestVideos.forEach((video, index) => {
            if (!video.videoData) return;

            const color = colors[index % colors.length];
            const card = document.createElement('div');
            card.className = 'video-card-compact';
            card.style.borderLeft = `4px solid ${color}`;
            card.onclick = () => window.open(`https://www.youtube.com/watch?v=${video.videoData.videoId}`, '_blank');

            card.innerHTML = `
                <div class="video-thumbnail-compact">
                    <img src="${video.videoData.thumbnail}" alt="thumbnail">
                    <div class="play-overlay">
                        <i class="fa-solid fa-play"></i>
                    </div>
                </div>
                <div class="video-info-compact">
                    <div class="channel-badge" style="background: ${this.hexToRgba(color, 0.15)}; color: ${color};">
                        ${video.channelTitle}
                    </div>
                    <div class="video-title-compact">${video.videoData.title}</div>
                    <div class="video-stats-compact">
                        <span><i class="fa-solid fa-eye"></i> ${this.formatNumber(video.videoData.views)}</span>
                        <span><i class="fa-solid fa-thumbs-up"></i> ${this.formatNumber(video.videoData.likes)}</span>
                        <span><i class="fa-solid fa-calendar"></i> ${video.videoData.publishedAt}</span>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });
    }

    formatNumber(num) {
        if (num >= 100000000) {
            const value = num / 100000000;
            return value % 1 === 0 ? value + '억' : value.toFixed(1) + '억';
        }
        if (num >= 10000) {
            const value = num / 10000;
            return value % 1 === 0 ? value + '만' : value.toFixed(1) + '만';
        }
        if (num >= 1000) {
            const value = num / 1000;
            return value % 1 === 0 ? value + '천' : value.toFixed(1) + '천';
        }
        return num.toString();
    }

    // 7. Recent Videos 렌더링
    renderRecentVideos(recentVideosData) {
        const container = document.getElementById('recentVideosContainer');
        if (!container) return;

        container.innerHTML = '';
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#fbbf24'];

        recentVideosData.forEach((channelData, index) => {
            const color = colors[index % colors.length];
            const channelSection = document.createElement('div');
            channelSection.className = 'channel-recent-videos';
            
            // 채널 헤더
            const header = document.createElement('div');
            header.className = 'recent-videos-header';
            header.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 12px; height: 12px; background: ${color}; border-radius: 2px;"></div>
                    <span style="font-weight: 600; color: var(--text-primary);">${channelData.channelTitle}</span>
                </div>
            `;

            // 영상 테이블
            const table = document.createElement('table');
            table.className = 'recent-videos-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th style="width: 100px;">썸네일</th>
                        <th>제목</th>
                        <th>업로드</th>
                        <th>조회수</th>
                        <th>좋아요</th>
                        <th>댓글</th>
                        <th>길이</th>
                    </tr>
                </thead>
                <tbody>
                    ${channelData.videos.map(video => `
                        <tr class="video-row" onclick="window.open('https://www.youtube.com/watch?v=${video.id}', '_blank')" style="cursor: pointer;">
                            <td>
                                <img src="${video.snippet.thumbnails.default.url}" 
                                     alt="썸네일" 
                                     style="width: 80px; height: 45px; object-fit: cover; border-radius: 4px;">
                            </td>
                            <td class="video-title-cell">
                                <div class="video-title-text">${video.snippet.title}</div>
                            </td>
                            <td>${this.formatDate(video.snippet.publishedAt)}</td>
                            <td>${this.formatNumber(parseInt(video.statistics.viewCount || 0))}</td>
                            <td>${this.formatNumber(parseInt(video.statistics.likeCount || 0))}</td>
                            <td>${this.formatNumber(parseInt(video.statistics.commentCount || 0))}</td>
                            <td>${this.formatDuration(video.contentDetails?.duration)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;

            channelSection.appendChild(header);
            channelSection.appendChild(table);
            container.appendChild(channelSection);
        });
    }

    // 날짜 포맷 (예: "2일 전", "1주 전")
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return '오늘';
        if (diffDays === 1) return '1일 전';
        if (diffDays < 7) return `${diffDays}일 전`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
        return `${Math.floor(diffDays / 365)}년 전`;
    }

    // Duration 포맷 (PT1H2M3S -> 1:02:03)
    formatDuration(duration) {
        if (!duration) return '-';
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return '-';

        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        const seconds = parseInt(match[3] || 0);

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    // 0. Overall Scores 렌더링
    renderOverallScores(scoreDataList) {
        const container = document.getElementById('overallScoreContainer');
        if (!container) return;

        container.innerHTML = '';
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#fbbf24'];

        // 점수 높은 순으로 정렬 및 순위 부여
        const sortedData = [...scoreDataList]
            .filter(data => data.score && typeof data.score.total !== 'undefined') // 유효한 데이터만 필터링
            .sort((a, b) => b.score.total - a.score.total);

        sortedData.forEach((data, index) => {
            const color = colors[this.getOriginalIndex(data.channelTitle, scoreDataList)];
            const rank = index + 1;
            let medal = '';
            if (rank === 1) medal = '🥇';
            else if (rank === 2) medal = '🥈';
            else if (rank === 3) medal = '🥉';

            const card = document.createElement('div');
            card.className = 'score-card';
            card.style.borderTop = `4px solid ${color}`;
            
            card.innerHTML = `
                <div class="score-header">
                    <div class="rank-badge">${medal || rank + '위'}</div>
                    <div class="channel-info">
                        <div class="channel-name" style="color: ${color}">${data.channelTitle}</div>
                        <div class="total-score">${data.score.total}점</div>
                    </div>
                </div>
                <div class="score-details">
                    <div class="score-item">
                        <span>규모</span>
                        <div class="score-bar"><div class="fill" style="width: ${data.score.details.scale}%; background: ${color}"></div></div>
                    </div>
                    <div class="score-item">
                        <span>성과</span>
                        <div class="score-bar"><div class="fill" style="width: ${data.score.details.performance}%; background: ${color}"></div></div>
                    </div>
                    <div class="score-item">
                        <span>성장</span>
                        <div class="score-bar"><div class="fill" style="width: ${data.score.details.growth}%; background: ${color}"></div></div>
                    </div>
                    <div class="score-item">
                        <span>참여</span>
                        <div class="score-bar"><div class="fill" style="width: ${data.score.details.engagement}%; background: ${color}"></div></div>
                    </div>
                    <div class="score-item">
                        <span>활동</span>
                        <div class="score-bar"><div class="fill" style="width: ${data.score.details.activity}%; background: ${color}"></div></div>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });
    }

    getOriginalIndex(title, list) {
        return list.findIndex(item => item.channelTitle === title) % 5;
    }

    // 8. Growth Trend Chart 렌더링 (최근 30일)
    renderGrowthTrendChart(analyzedData) {
        const ctx = document.getElementById('growthTrendChart');
        if (!ctx) return;

        if (this.growthTrendChart) this.growthTrendChart.destroy();

        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#fbbf24'];
        
        // 1. 최근 30일 날짜 기준 설정
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 헬퍼 함수: 날짜 객체를 YYYY-MM-DD 문자열로 변환
        const getDateStr = (date) => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // 2. 모든 채널의 최근 30일 영상 수집 및 날짜(YYYY-MM-DD) 추출
        const allDates = new Set();
        const channelDataMap = analyzedData.map((data, index) => {
            // 최근 30일 이내 영상 필터링 & 날짜 오름차순 정렬
            const recentVideos = data.videos
                .filter(v => new Date(v.snippet.publishedAt) >= thirtyDaysAgo)
                .sort((a, b) => new Date(a.snippet.publishedAt) - new Date(b.snippet.publishedAt));

            recentVideos.forEach(v => {
                const date = new Date(v.snippet.publishedAt);
                allDates.add(getDateStr(date));
            });

            return {
                label: data.metrics.channelTitle,
                videos: recentVideos,
                color: colors[index % colors.length]
            };
        });

        // 3. 날짜 라벨 정렬 (YYYY-MM-DD 기준)
        const labels = Array.from(allDates).sort();

        // 4. 데이터셋 구성
        const datasets = channelDataMap.map(ch => {
            const dataPoints = labels.map(dateLabel => {
                const videosOnDate = ch.videos.filter(v => {
                    const d = new Date(v.snippet.publishedAt);
                    return getDateStr(d) === dateLabel;
                });

                if (videosOnDate.length === 0) return { x: dateLabel, y: null };

                const bestVideo = videosOnDate.reduce((prev, current) => {
                    return (parseInt(prev.statistics.viewCount) > parseInt(current.statistics.viewCount)) ? prev : current;
                });

                return {
                    x: dateLabel,
                    y: parseInt(bestVideo.statistics.viewCount || 0),
                    title: bestVideo.snippet.title,
                    videoId: bestVideo.id
                };
            });

            return {
                label: ch.label,
                data: dataPoints,
                borderColor: ch.color,
                backgroundColor: this.hexToRgba(ch.color, 0.1),
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 7,
                fill: false,
                spanGaps: true
            };
        });

        this.growthTrendChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    intersect: true,
                    axis: 'x'
                },
                scales: {
                    x: {
                        grid: { display: false },
                        title: { display: true, text: '날짜 (최근 30일)', color: '#94a3b8' },
                        ticks: { 
                            color: '#94a3b8',
                            callback: function(val, index) {
                                const label = this.getLabelForValue(val);
                                const [y, m, d] = label.split('-');
                                return `${m}.${d}`;
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: {
                            color: '#f8fafc',
                            callback: (value) => this.formatNumber(value)
                        }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#f8fafc' } },
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                const label = context[0].label;
                                const [y, m, d] = label.split('-');
                                return `${m}.${d}`;
                            },
                            label: (context) => {
                                const point = context.raw;
                                return `${context.dataset.label}: ${this.formatNumber(point.y)}회 - ${point.title}`;
                            }
                        }
                    }
                },
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const element = elements[0];
                        const datasetIndex = element.datasetIndex;
                        const index = element.index;
                        const point = this.growthTrendChart.data.datasets[datasetIndex].data[index];
                        if (point && point.videoId) {
                            window.open(`https://www.youtube.com/watch?v=${point.videoId}`, '_blank');
                        }
                    }
                }
            }
        });
    }

    // 6. Keywords 렌더링
    renderKeywords(keywordDataList) {
        const container = document.getElementById('keywordsContainer');
        if (!container) return;

        container.innerHTML = '';
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#fbbf24'];

        keywordDataList.forEach((data, index) => {
            const color = colors[index % colors.length];
            const channelDiv = document.createElement('div');
            channelDiv.className = 'channel-keywords';
            
            const header = document.createElement('div');
            header.className = 'keyword-header';
            header.innerHTML = `
                <div style="width: 12px; height: 12px; background: ${color}; border-radius: 2px;"></div>
                <span style="font-weight: 600; color: var(--text-primary);">${data.channelTitle}</span>
            `;

            const chipsContainer = document.createElement('div');
            chipsContainer.className = 'keyword-chips';

            if (data.keywords.length === 0) {
                chipsContainer.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.9rem;">분석된 키워드가 없습니다.</span>';
            } else {
                data.keywords.forEach(k => {
                    const chip = document.createElement('span');
                    chip.className = 'keyword-chip';
                    chip.style.backgroundColor = this.hexToRgba(color, 0.15);
                    chip.style.color = color;
                    chip.style.border = `1px solid ${this.hexToRgba(color, 0.3)}`;
                    chip.style.cursor = 'pointer';
                    chip.textContent = `#${k.word} (${k.count})`;
                    
                    // 유튜브 검색 링크 추가
                    chip.addEventListener('click', () => {
                        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(k.word)}`;
                        window.open(searchUrl, '_blank');
                    });
                    
                    // 호버 효과
                    chip.addEventListener('mouseenter', () => {
                        chip.style.backgroundColor = this.hexToRgba(color, 0.25);
                    });
                    chip.addEventListener('mouseleave', () => {
                        chip.style.backgroundColor = this.hexToRgba(color, 0.15);
                    });
                    
                    chipsContainer.appendChild(chip);
                });
            }

            channelDiv.appendChild(header);
            channelDiv.appendChild(chipsContainer);
            container.appendChild(channelDiv);
        });
    }
}

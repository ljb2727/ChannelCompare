export class ChartManager {
    constructor() {
        this.radarChart = null;
        this.contentTypeChart = null;
        this.lengthVsViewsChart = null;
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

    // 3. Content Type Chart 렌더링 (숏폼 vs 롱폼)
    renderContentTypeChart(metricsDataList) {
        const ctx = document.getElementById('contentTypeChart');
        if (!ctx) return;

        if (this.contentTypeChart) this.contentTypeChart.destroy();

        const labels = metricsDataList.map(data => data.channelTitle);
        const shortFormData = metricsDataList.map(data => parseFloat(data.shortFormRatio));
        const longFormData = metricsDataList.map(data => parseFloat(data.longFormRatio));

        this.contentTypeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '📱 숏폼 (≤3분)',
                        data: shortFormData,
                        backgroundColor: 'rgba(59, 130, 246, 0.7)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 2
                    },
                    {
                        label: '🎬 롱폼 (>3분)',
                        data: longFormData,
                        backgroundColor: 'rgba(139, 92, 246, 0.7)',
                        borderColor: 'rgba(139, 92, 246, 1)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: '#94a3b8',
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#f8fafc',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#f8fafc',
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y.toFixed(1);
                                return `${label}: ${value}%`;
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
                    title: video.snippet.title // 툴팁용
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
                    chip.textContent = `#${k.word} (${k.count})`;
                    chipsContainer.appendChild(chip);
                });
            }

            channelDiv.appendChild(header);
            channelDiv.appendChild(chipsContainer);
            container.appendChild(channelDiv);
        });
    }
}

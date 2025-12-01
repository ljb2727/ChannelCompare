export class ChannelAnalyzer {
    constructor() {}

    // 1. Core Metrics 계산
    analyzeMetrics(channelData, videos) {
        const stats = channelData.statistics;
        
        // 최근 30개 영상의 평균 조회수
        const recentVideos = videos.slice(0, 30);
        const avgViews = recentVideos.length > 0 
            ? recentVideos.reduce((sum, v) => sum + parseInt(v.statistics.viewCount || 0), 0) / recentVideos.length
            : 0;

        // 참여도 (평균 조회수 / 구독자 수)
        const engagement = parseInt(stats.subscriberCount) > 0 
            ? avgViews / parseInt(stats.subscriberCount)
            : 0;

        // 조회수 등락률 (최근 5개 vs 그 전 5개 비교)
        // 영상이 시간순(최신순)으로 정렬되어 있다고 가정
        const recentGroup = videos.slice(0, 5);
        const pastGroup = videos.slice(5, 10);
        
        let growthRate = 0;
        if (recentGroup.length > 0 && pastGroup.length > 0) {
            const recentAvg = recentGroup.reduce((sum, v) => sum + parseInt(v.statistics.viewCount || 0), 0) / recentGroup.length;
            const pastAvg = pastGroup.reduce((sum, v) => sum + parseInt(v.statistics.viewCount || 0), 0) / pastGroup.length;
            
            if (pastAvg > 0) {
                growthRate = ((recentAvg - pastAvg) / pastAvg) * 100;
            } else if (recentAvg > 0) {
                growthRate = 100; // 이전 조회수가 0인데 최근 조회수가 있으면 100% 성장으로 간주
            }
        }

        // 숏폼/롱폼 분석 (3분 기준)
        const shortFormCount = videos.filter(v => this.parseDuration(v.contentDetails?.duration) <= 180).length;
        const longFormCount = videos.length - shortFormCount;
        const shortFormRatio = videos.length > 0 ? (shortFormCount / videos.length * 100).toFixed(1) : 0;
        const longFormRatio = videos.length > 0 ? (longFormCount / videos.length * 100).toFixed(1) : 0;

        // 평균 업로드 주기 계산 (일 단위)
        let uploadFrequency = 0;
        if (videos.length > 1) {
            const latest = new Date(videos[0].snippet.publishedAt);
            const oldest = new Date(videos[videos.length - 1].snippet.publishedAt);
            const diffTime = Math.abs(latest - oldest);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            uploadFrequency = (diffDays / (videos.length - 1)).toFixed(1);
        }

        return {
            channelId: channelData.id,
            channelTitle: channelData.snippet.title,
            thumbnail: channelData.snippet.thumbnails.default.url,
            subscribers: parseInt(stats.subscriberCount || 0),
            totalViews: parseInt(stats.viewCount || 0),
            videoCount: parseInt(stats.videoCount || 0),
            avgViews: Math.round(avgViews),
            engagement: engagement.toFixed(2),
            growthRate: growthRate.toFixed(1),
            uploadFrequency, // 업로드 주기 추가
            publishedAt: new Date(channelData.snippet.publishedAt).toLocaleDateString('ko-KR'),
            shortFormCount,
            longFormCount,
            shortFormRatio,
            longFormRatio,
            channelData,
            videos
        };
    }

    // ISO 8601 duration을 초 단위로 파싱 (PT3M45S -> 225초)
    parseDuration(duration) {
        if (!duration) return 0;
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        const seconds = parseInt(match[3] || 0);
        return hours * 3600 + minutes * 60 + seconds;
    }

    // 2. Radar Chart 데이터 (5가지 항목 평가)
    calculateRadarScores(metrics) {
        // 모든 채널을 동일 기준으로 평가하기 위해 정규화 필요
        // 각 항목은 0~100 점수로 변환
        
        return {
            channelTitle: metrics.channelTitle,
            scores: {
                '구독자 규모': this.normalizeLog(metrics.subscribers, 1000, 10000000),
                '조회수 파워': this.normalizeLog(metrics.totalViews, 100000, 1000000000),
                '영상 수': this.normalizeLog(metrics.videoCount, 10, 5000),
                '참여도': this.normalizeLog(metrics.engagement, 0.01, 50), // 로그스케일 적용
                '최근 성과': this.normalizeLog(metrics.avgViews, 1000, 10000000)
            }
        };
    }

    // 로그 스케일 정규화 (작은 값과 큰 값의 차이를 완화)
    normalizeLog(value, min, max) {
        if (value <= 0) return 0;
        const logValue = Math.log10(value);
        const logMin = Math.log10(min);
        const logMax = Math.log10(max);
        const normalized = ((logValue - logMin) / (logMax - logMin)) * 100;
        return Math.max(0, Math.min(100, normalized));
    }

    // 선형 정규화
    normalizeLinear(value, min, max) {
        const normalized = ((value - min) / (max - min)) * 100;
        return Math.max(0, Math.min(100, normalized));
    }

    // 4. Upload Pattern 분석 (요일별, 시간대별)
    analyzeUploadPattern(videos) {
        const hourPattern = Array(24).fill(0); // 24시간
        const dayPattern = Array(7).fill(0); // 0=일요일, 6=토요일

        videos.forEach(video => {
            const publishedAt = new Date(video.snippet.publishedAt);
            const hour = publishedAt.getHours();
            const day = publishedAt.getDay();
            hourPattern[hour]++;
            dayPattern[day]++;
        });

        // 정규화 (가장 많이 올린 시간대를 100으로)
        const maxHourCount = Math.max(...hourPattern, 1);
        const normalizedHours = hourPattern.map(count => count / maxHourCount);

        const maxDayCount = Math.max(...dayPattern, 1);
        const normalizedDays = dayPattern.map(count => count / maxDayCount);

        return {
            hours: normalizedHours,
            days: normalizedDays
        };
    }

    // 5. Best Performance Video 찾기
    findBestVideo(videos) {
        if (!videos || videos.length === 0) return null;

        // 최근 30개 중에서 조회수가 가장 높은 영상
        const recentVideos = videos.slice(0, 30);
        
        const sorted = recentVideos.sort((a, b) => {
            const viewsA = parseInt(a.statistics.viewCount || 0);
            const viewsB = parseInt(b.statistics.viewCount || 0);
            return viewsB - viewsA;
        });

        const best = sorted[0];
        if (!best) return null;

        return {
            videoId: best.id,
            title: best.snippet.title,
            thumbnail: best.snippet.thumbnails.medium.url,
            views: parseInt(best.statistics.viewCount || 0),
            likes: parseInt(best.statistics.likeCount || 0),
            publishedAt: new Date(best.snippet.publishedAt).toLocaleDateString('ko-KR')
        };
    }

    // 숫자를 한국식으로 포맷팅 (천, 만, 억)
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

    // 테이블 행 HTML 생성
    generateMetricsTableRow(metrics) {
        const growth = parseFloat(metrics.growthRate);
        let growthClass = 'text-secondary';
        let growthIcon = 'fa-minus';
        let growthColor = '#94a3b8';

        if (growth > 0) {
            growthClass = 'text-success';
            growthIcon = 'fa-arrow-trend-up';
            growthColor = '#22c55e';
        } else if (growth < 0) {
            growthClass = 'text-danger';
            growthIcon = 'fa-arrow-trend-down';
            growthColor = '#ef4444';
        }

        return `
            <tr>
                <td>
                    <div class="channel-cell">
                        <img src="${metrics.thumbnail}" alt="${metrics.channelTitle}">
                        <span>${metrics.channelTitle}</span>
                    </div>
                </td>
                <td>${this.formatNumber(metrics.subscribers)}</td>
                <td>${this.formatNumber(metrics.totalViews)}</td>
                <td>${this.formatNumber(metrics.videoCount)}</td>
                <td>${this.formatNumber(metrics.avgViews)}</td>
                <td>
                    <span style="color: ${growthColor}; font-weight: 600;">
                        <i class="fa-solid ${growthIcon}"></i> ${growth > 0 ? '+' : ''}${metrics.growthRate}%
                    </span>
                </td>
                <td>${metrics.uploadFrequency}일 / 1영상</td>
                <td>${metrics.publishedAt}</td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 2px; font-size: 0.85rem;">
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #3b82f6;">📱 ${metrics.shortFormRatio}%</span>
                            <span style="color: var(--text-secondary); font-size: 0.75rem;">(${metrics.shortFormCount}개)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #8b5cf6;">🎬 ${metrics.longFormRatio}%</span>
                            <span style="color: var(--text-secondary); font-size: 0.75rem;">(${metrics.longFormCount}개)</span>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    // 6. 키워드 분석 (제목 + 설명)
    analyzeKeywords(videos) {
        const text = videos.map(v => `${v.snippet.title} ${v.snippet.description}`).join(' ');
        
        // 특수문자 제거 및 공백 기준 분리
        const words = text.replace(/[^\w\s가-힣]/g, ' ').split(/\s+/);
        const wordCounts = {};

        words.forEach(word => {
            // 2글자 이상이고 불용어가 아닌 경우만 카운트
            if (word.length >= 2 && !this.isStopWord(word)) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });

        // 빈도수 내림차순 정렬 후 Top 10 추출
        return Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));
    }

    // 불용어 체크 (의미 없는 단어 제외)
    isStopWord(word) {
        const stopWords = [
            '영상', '오늘', '진짜', '너무', '정말', '다들', '많이', '하고', '해서', '있는', 
            '합니다', '입니다', '구독', '좋아요', '알림', '설정', '링크', 'instagram', 
            'youtube', 'channel', 'video', 'http', 'https', 'com', 'www', 'youtu', 'be',
            'shorts', '쇼츠', '동영상', '시청', '감사합니다', '안녕하세요', '여러분',
            '함께', '바로', '지금', '이번', '저희', '제가', '하는', '할수', '없는', '있습니다',
            '그리고', '하지만', '그래서', '그런데', '어떻게', '왜냐하면', '무엇을', '무엇이'
        ];
        return stopWords.includes(word.toLowerCase());
    }
}

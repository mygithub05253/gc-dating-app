import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:kakao_flutter_sdk_user/kakao_flutter_sdk_user.dart';

void main() {
  KakaoSdk.init(nativeAppKey: '033bc5c71a42c748495bf1ec7b0ef77e');
  runApp(const EmberTestApp());
}

class EmberTestApp extends StatelessWidget {
  const EmberTestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ember API Test',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFF6B35),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const ApiTestPage(),
    );
  }
}

class ApiTestPage extends StatefulWidget {
  const ApiTestPage({super.key});

  @override
  State<ApiTestPage> createState() => _ApiTestPageState();
}

class _ApiTestPageState extends State<ApiTestPage> {
  final String baseUrl = 'https://ember-app.duckdns.org';

  final Dio dio = Dio();
  String? accessToken;
  String? refreshToken;
  String? kakaoAccessToken;
  String? generatedNickname;
  final List<String> logs = [];

  void log(String message) {
    setState(() {
      logs.insert(0, '[${DateTime.now().toString().substring(11, 19)}] $message');
      if (logs.length > 50) logs.removeLast();
    });
  }

  // 1. 카카오 SDK 로그인 → Access Token 획득
  Future<void> kakaoLogin() async {
    try {
      OAuthToken token;
      if (await isKakaoTalkInstalled()) {
        token = await UserApi.instance.loginWithKakaoTalk();
        log('카카오톡으로 로그인 성공');
      } else {
        token = await UserApi.instance.loginWithKakaoAccount();
        log('카카오 계정으로 로그인 성공');
      }
      kakaoAccessToken = token.accessToken;
      log('카카오 AT: ${kakaoAccessToken!.substring(0, 20)}...');
    } catch (e) {
      log('카카오 로그인 실패: $e');
    }
  }

  // 2. 서버 소셜 로그인
  Future<void> socialLogin() async {
    if (kakaoAccessToken == null) {
      log('먼저 카카오 로그인을 하세요');
      return;
    }
    try {
      final res = await dio.post('$baseUrl/api/auth/social', data: {
        'provider': 'KAKAO',
        'socialToken': kakaoAccessToken,
      });
      final data = res.data['data'];
      accessToken = data['accessToken'];
      refreshToken = data['refreshToken'];
      dio.options.headers['Authorization'] = 'Bearer $accessToken';

      log('서버 로그인 성공! userId=${data['userId']}, '
          'isNew=${data['isNewUser']}, '
          'step=${data['onboardingStep']}');

      if (data['accountStatus'] == 'PENDING_DELETION') {
        log('-> 탈퇴 유예 계정 -> 복구 화면');
      } else if (data['onboardingStep'] == 0) {
        log('-> 온보딩 미시작 -> 프로필 등록');
      } else if (data['onboardingStep'] == 1) {
        log('-> 프로필 완료 -> 이상형 설정');
      } else {
        log('-> 온보딩 완료 -> 홈');
      }
    } catch (e) {
      log('서버 로그인 실패: $e');
    }
  }

  // 3. 약관 동의
  Future<void> consentUserTerms() async {
    try {
      await dio.post('$baseUrl/api/consent',
        data: {'consentType': 'USER_TERMS'},
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      log('서비스 이용약관 동의 완료');
    } catch (e) {
      log('약관 동의 실패: $e');
    }
  }

  Future<void> consentAiTerms() async {
    try {
      await dio.post('$baseUrl/api/consent',
        data: {'consentType': 'AI_TERMS'},
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      log('AI 분석 동의 완료');
    } catch (e) {
      log('AI 동의 실패: $e');
    }
  }

  // 4. 닉네임 생성
  Future<void> generateNickname() async {
    try {
      final res = await dio.post('$baseUrl/api/users/nickname/generate');
      generatedNickname = res.data['data']['nickname'];
      log('닉네임 생성: $generatedNickname');
    } catch (e) {
      log('닉네임 생성 실패: $e');
    }
  }

  // 5. 프로필 등록
  Future<void> createProfile() async {
    if (generatedNickname == null) {
      log('먼저 닉네임을 생성하세요');
      return;
    }
    try {
      final res = await dio.post('$baseUrl/api/users/profile',
        data: {
          'nickname': generatedNickname,
          'realName': '테스트',
          'birthDate': '2000-01-15',
          'gender': 'MALE',
          'sido': '경기도',
          'sigungu': '성남시',
          'school': '가천대학교',
        },
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      log('프로필 등록 성공: nickname=${res.data['data']['nickname']}');
    } catch (e) {
      log('프로필 등록 실패: $e');
    }
  }

  // 6. 키워드 목록 조회
  Future<void> getKeywords() async {
    try {
      final res = await dio.get('$baseUrl/api/users/ideal-type/keyword-list');
      final keywords = res.data['data']['keywords'] as List;
      log('키워드 ${keywords.length}개: ${keywords.map((k) => k['label']).join(', ')}');
    } catch (e) {
      log('키워드 조회 실패: $e');
    }
  }

  // 7. 이상형 설정
  Future<void> saveIdealType() async {
    try {
      final listRes = await dio.get('$baseUrl/api/users/ideal-type/keyword-list');
      final keywords = listRes.data['data']['keywords'] as List;
      if (keywords.length < 3) {
        log('키워드가 3개 미만 (DB 시드 필요)');
        return;
      }
      final ids = keywords.take(3).map((k) => k['id']).toList();

      final res = await dio.post('$baseUrl/api/users/ideal-type/keywords',
        data: {'keywordIds': ids},
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      log('이상형 설정 완료: ${res.data['data']['keywords']}');
    } catch (e) {
      log('이상형 설정 실패: $e');
    }
  }

  // 8. 내 프로필 조회
  Future<void> getMyProfile() async {
    try {
      final res = await dio.get('$baseUrl/api/users/me',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      final data = res.data['data'];
      log('프로필: ${data['nickname']}, '
          'step=${data['onboardingStep']}, '
          'completed=${data['onboardingCompleted']}, '
          'keywords=${data['idealKeywords']?.length ?? 0}개');
    } catch (e) {
      log('프로필 조회 실패: $e');
    }
  }

  // 9. 토큰 갱신
  Future<void> refreshTokenApi() async {
    try {
      final res = await dio.post('$baseUrl/api/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      accessToken = res.data['data']['accessToken'];
      refreshToken = res.data['data']['refreshToken'];
      log('토큰 갱신 성공!');
    } catch (e) {
      log('토큰 갱신 실패: $e');
    }
  }

  // 10. 로그아웃
  Future<void> logout() async {
    try {
      await dio.post('$baseUrl/api/auth/logout',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      log('로그아웃 성공!');
      accessToken = null;
      refreshToken = null;
      kakaoAccessToken = null;
    } catch (e) {
      log('로그아웃 실패: $e');
    }
  }

  // 11. 헬스체크
  Future<void> healthCheck() async {
    try {
      final res = await dio.get('$baseUrl/api/health');
      log('헬스체크: ${res.data['data']['status']}');
    } catch (e) {
      log('헬스체크 실패: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ember API Test'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // 상태 바
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            color: accessToken != null ? Colors.green.shade900 : Colors.red.shade900,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  accessToken != null ? '서버 로그인됨' : '미로그인',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                if (kakaoAccessToken != null)
                  Text('카카오 AT: ${kakaoAccessToken!.substring(0, 20)}...',
                    style: const TextStyle(fontSize: 11, color: Colors.white70)),
              ],
            ),
          ),

          // 버튼 그리드
          Expanded(
            flex: 1,
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  _btn('헬스체크', healthCheck, Colors.blue),
                  _btn('카카오 로그인', kakaoLogin, Colors.yellow.shade800),
                  _btn('서버 로그인', socialLogin, Colors.orange),
                  _btn('약관동의', consentUserTerms, Colors.deepOrange),
                  _btn('AI동의', consentAiTerms, Colors.deepOrange),
                  _btn('닉네임 생성', generateNickname, Colors.teal),
                  _btn('프로필 등록', createProfile, Colors.purple),
                  _btn('키워드 목록', getKeywords, Colors.cyan),
                  _btn('이상형 설정', saveIdealType, Colors.pink),
                  _btn('내 프로필', getMyProfile, Colors.indigo),
                  _btn('토큰 갱신', refreshTokenApi, Colors.amber),
                  _btn('로그아웃', logout, Colors.red),
                ],
              ),
            ),
          ),

          // 로그 영역
          Expanded(
            flex: 2,
            child: Container(
              width: double.infinity,
              color: Colors.black87,
              child: ListView.builder(
                padding: const EdgeInsets.all(8),
                itemCount: logs.length,
                itemBuilder: (_, i) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    logs[i],
                    style: TextStyle(
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: logs[i].contains('성공') || logs[i].contains('완료')
                          ? Colors.greenAccent
                          : logs[i].contains('실패')
                              ? Colors.redAccent
                              : logs[i].contains('->')
                                  ? Colors.amberAccent
                                  : Colors.white70,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _btn(String label, VoidCallback onPressed, Color color) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: color.withValues(alpha: 0.8),
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      ),
      child: Text(label, style: const TextStyle(fontSize: 13)),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:kakao_flutter_sdk_user/kakao_flutter_sdk_user.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'dart:convert';

// 백그라운드 메시지 핸들러 (top-level 함수여야 함)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('[FCM 백그라운드] ${message.notification?.title}: ${message.notification?.body}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  KakaoSdk.init(nativeAppKey: '033bc5c71a42c748495bf1ec7b0ef77e');
  runApp(const EmberTestApp());
}

class EmberTestApp extends StatelessWidget {
  const EmberTestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: AppState().navigatorKey,
      title: 'Ember Test',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFF6B35),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}

// ── 공통 상태 관리 ──
class AppState {
  static final AppState _instance = AppState._();
  factory AppState() => _instance;
  AppState._();

  final String baseUrl = 'https://ember-app.duckdns.org';
  final Dio dio = Dio();

  String? accessToken;
  String? refreshToken;
  String? kakaoAccessToken;
  int? userId;
  int onboardingStep = 0;
  bool onboardingCompleted = false;
  String? accountStatus;
  String? restoreToken;

  Options get authHeaders => Options(
    headers: {'Authorization': 'Bearer $accessToken'},
  );

  String errMsg(dynamic e) {
    if (e is DioException && e.response?.data != null) {
      final data = e.response!.data;
      if (data is Map) return '[${data['code']}] ${data['message']}';
    }
    return '$e';
  }

  // FCM 토큰 등록 + 포그라운드 알림 설정
  Future<void> setupFcm() async {
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(
        alert: true, badge: true, sound: true,
      );

      final token = await messaging.getToken();
      if (token != null && accessToken != null) {
        await dio.post('$baseUrl/api/users/me/fcm-token',
          data: {'token': token, 'deviceType': 'ANDROID'},
          options: authHeaders,
        );
        debugPrint('[FCM] 토큰 등록 완료: ${token.substring(0, 20)}...');
      }

      messaging.onTokenRefresh.listen((newToken) async {
        if (accessToken != null) {
          await dio.post('$baseUrl/api/users/me/fcm-token',
            data: {'token': newToken, 'deviceType': 'ANDROID'},
            options: authHeaders,
          );
          debugPrint('[FCM] 토큰 갱신 등록');
        }
      });

      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('[FCM 포그라운드] ${message.notification?.title}: ${message.notification?.body}');
        if (_navigatorKey.currentContext != null) {
          final ctx = _navigatorKey.currentContext!;
          ScaffoldMessenger.of(ctx).showSnackBar(
            SnackBar(
              content: Text('${message.notification?.title ?? "알림"}: ${message.notification?.body ?? ""}'),
              duration: const Duration(seconds: 4),
              action: SnackBarAction(label: '확인', onPressed: () {}),
            ),
          );
        }
      });
    } catch (e) {
      debugPrint('[FCM] 설정 실패: $e');
    }
  }

  static final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();
  GlobalKey<NavigatorState> get navigatorKey => _navigatorKey;
}

// ══════════════════════════════════════
// 1.1 스플래시 및 자동 로그인
// ══════════════════════════════════════
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  String status = '로딩 중...';

  @override
  void initState() {
    super.initState();
    _checkAutoLogin();
  }

  Future<void> _checkAutoLogin() async {
    await Future.delayed(const Duration(seconds: 2));
    final app = AppState();

    if (app.refreshToken == null) {
      setState(() => status = '로그인이 필요합니다');
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) _goToLogin();
      return;
    }

    try {
      final res = await app.dio.post('${app.baseUrl}/api/auth/refresh',
        data: {'refreshToken': app.refreshToken});
      app.accessToken = res.data['data']['accessToken'];
      app.refreshToken = res.data['data']['refreshToken'];
      if (mounted) _goToHome();
    } catch (e) {
      setState(() => status = '세션 만료');
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) _goToLogin();
    }
  }

  void _goToLogin() => Navigator.pushReplacement(
    context, MaterialPageRoute(builder: (_) => const LoginScreen()));
  void _goToHome() => Navigator.pushReplacement(
    context, MaterialPageRoute(builder: (_) => const HomeScreen()));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('🔥', style: TextStyle(fontSize: 64)),
            const SizedBox(height: 16),
            const Text('Ember', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(status, style: const TextStyle(color: Colors.white70)),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════
// 2.2 소셜 로그인 (카카오)
// ══════════════════════════════════════
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String? message;
  bool loading = false;

  Future<void> _kakaoLogin() async {
    setState(() { loading = true; message = null; });
    final app = AppState();

    try {
      OAuthToken token;
      if (await isKakaoTalkInstalled()) {
        token = await UserApi.instance.loginWithKakaoTalk();
      } else {
        token = await UserApi.instance.loginWithKakaoAccount();
      }
      app.kakaoAccessToken = token.accessToken;
      setState(() => message = '카카오 로그인 성공');

      final res = await app.dio.post('${app.baseUrl}/api/auth/social', data: {
        'provider': 'KAKAO',
        'socialToken': app.kakaoAccessToken,
      });
      final data = res.data['data'];
      app.accessToken = data['accessToken'];
      app.refreshToken = data['refreshToken'];
      app.userId = data['userId'];
      app.onboardingStep = data['onboardingStep'];
      app.onboardingCompleted = data['onboardingCompleted'];
      app.accountStatus = data['accountStatus'];
      app.restoreToken = data['restoreToken'];

      setState(() => message = '서버 로그인 성공! (userId=${data['userId']})');

      await app.setupFcm();

      if (mounted) {
        await Future.delayed(const Duration(milliseconds: 500));
        if (data['accountStatus'] == 'PENDING_DELETION') {
          Navigator.pushReplacement(context,
            MaterialPageRoute(builder: (_) => const RestoreScreen()));
        } else if (data['isNewUser'] == true) {
          Navigator.pushReplacement(context,
            MaterialPageRoute(builder: (_) => const ConsentScreen()));
        } else if (data['onboardingStep'] == 0) {
          Navigator.pushReplacement(context,
            MaterialPageRoute(builder: (_) => const ProfileSetupScreen()));
        } else if (data['onboardingStep'] == 1) {
          Navigator.pushReplacement(context,
            MaterialPageRoute(builder: (_) => const IdealTypeScreen()));
        } else {
          Navigator.pushReplacement(context,
            MaterialPageRoute(builder: (_) => const HomeScreen()));
        }
      }
    } catch (e) {
      setState(() { message = app.errMsg(e); loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('🔥', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 8),
              const Text('Ember 시작하기', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('프로필 사진 없이, 내면을 먼저 보는 소개팅',
                style: TextStyle(color: Colors.white54), textAlign: TextAlign.center),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: loading ? null : _kakaoLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFEE500),
                    foregroundColor: Colors.black87,
                  ),
                  child: loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('카카오로 시작', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: loading ? null : () => _devLogin(8),
                  child: const Text('Dev 로그인 (건강한하늘)', style: TextStyle(fontSize: 14)),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: loading ? null : () => _devLogin(9),
                  child: const Text('Dev 로그인 (맑은바다)', style: TextStyle(fontSize: 14)),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: loading ? null : _devRegister,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.deepPurple,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('신규 가입 시뮬레이션', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                ),
              ),
              if (message != null) ...[
                const SizedBox(height: 16),
                Text(message!, style: TextStyle(
                  color: message!.contains('성공') ? Colors.greenAccent : Colors.redAccent,
                  fontSize: 13)),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _devRegister() async {
    setState(() { loading = true; message = null; });
    final app = AppState();
    try {
      final res = await app.dio.post('${app.baseUrl}/api/dev/register');
      app.accessToken = res.data['accessToken'];
      app.userId = res.data['userId'];
      setState(() => message = '신규 유저 생성! (userId=${app.userId})');
      await Future.delayed(const Duration(milliseconds: 500));
      if (mounted) {
        Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => const ConsentScreen()));
      }
    } catch (e) {
      setState(() { message = app.errMsg(e); loading = false; });
    }
  }

  Future<void> _devLogin(int userId) async {
    setState(() { loading = true; message = null; });
    final app = AppState();
    try {
      final res = await app.dio.get('${app.baseUrl}/api/dev/token', queryParameters: {'userId': userId});
      app.accessToken = res.data['accessToken'];
      app.userId = userId;
      setState(() => message = 'Dev 로그인 성공! (userId=$userId)');
      await app.setupFcm();
      await Future.delayed(const Duration(milliseconds: 500));
      if (mounted) {
        Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => const HomeScreen()));
      }
    } catch (e) {
      setState(() { message = app.errMsg(e); loading = false; });
    }
  }
}

// ══════════════════════════════════════
// 2.2 약관 동의 (신규 가입)
// ══════════════════════════════════════
class ConsentScreen extends StatefulWidget {
  const ConsentScreen({super.key});

  @override
  State<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends State<ConsentScreen> {
  bool userTerms = false;
  bool aiTerms = false;
  String? message;

  Future<void> _submit() async {
    final app = AppState();
    try {
      if (userTerms) {
        await app.dio.post('${app.baseUrl}/api/consent',
          data: {'consentType': 'USER_TERMS'}, options: app.authHeaders);
      }
      if (aiTerms) {
        await app.dio.post('${app.baseUrl}/api/consent',
          data: {'consentType': 'AI_TERMS'}, options: app.authHeaders);
      }
      if (mounted) {
        Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => const ProfileSetupScreen()));
      }
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('약관 동의')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('서비스 이용을 위해\n약관에 동의해주세요',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 32),
            CheckboxListTile(
              title: const Text('서비스 이용약관 (필수)'),
              value: userTerms,
              onChanged: (v) => setState(() => userTerms = v!),
            ),
            CheckboxListTile(
              title: const Text('AI 분석 동의 (필수)'),
              value: aiTerms,
              onChanged: (v) => setState(() => aiTerms = v!),
            ),
            const Spacer(),
            if (message != null) Text(message!, style: const TextStyle(color: Colors.redAccent)),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity, height: 48,
              child: ElevatedButton(
                onPressed: userTerms && aiTerms ? _submit : null,
                child: const Text('전체 동의 후 계속'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════
// 2.6 계정 복구
// ══════════════════════════════════════
class RestoreScreen extends StatelessWidget {
  const RestoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppState();
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.warning_amber, size: 64, color: Colors.amber),
              const SizedBox(height: 16),
              const Text('탈퇴 유예 중인 계정', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity, height: 48,
                child: ElevatedButton(
                  onPressed: () async {
                    try {
                      final res = await app.dio.post('${app.baseUrl}/api/auth/restore',
                        data: {'restoreToken': app.restoreToken});
                      app.accessToken = res.data['data']['accessToken'];
                      app.refreshToken = res.data['data']['refreshToken'];
                      if (context.mounted) {
                        Navigator.pushReplacement(context,
                          MaterialPageRoute(builder: (_) => const HomeScreen()));
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(app.errMsg(e))));
                      }
                    }
                  },
                  child: const Text('계정 복구'),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => Navigator.pushReplacement(context,
                  MaterialPageRoute(builder: (_) => const LoginScreen())),
                child: const Text('탈퇴 진행', style: TextStyle(color: Colors.red)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ══════════════════════════════════════
// 3.1 기본 프로필 설정
// ══════════════════════════════════════
class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final app = AppState();
  String nickname = '';
  final realNameCtrl = TextEditingController();
  final birthCtrl = TextEditingController(text: '2000-01-15');
  final schoolCtrl = TextEditingController();
  String gender = 'MALE';
  String sido = '경기도';
  String sigungu = '성남시';
  String? message;

  @override
  void initState() {
    super.initState();
    _generateNickname();
  }

  Future<void> _generateNickname() async {
    try {
      final res = await app.dio.post('${app.baseUrl}/api/users/nickname/generate');
      setState(() => nickname = res.data['data']['nickname']);
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  Future<void> _submit() async {
    try {
      await app.dio.post('${app.baseUrl}/api/users/profile',
        data: {
          'nickname': nickname,
          'realName': realNameCtrl.text,
          'birthDate': birthCtrl.text,
          'gender': gender,
          'sido': sido,
          'sigungu': sigungu,
          'school': schoolCtrl.text.isEmpty ? null : schoolCtrl.text,
        },
        options: app.authHeaders);
      if (mounted) {
        Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => const IdealTypeScreen()));
      }
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('프로필 설정 (1/2)')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('기본 프로필 설정', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            TextField(controller: realNameCtrl,
              decoration: const InputDecoration(labelText: '실명', border: OutlineInputBorder())),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(child: InputDecorator(
                decoration: const InputDecoration(labelText: '닉네임', border: OutlineInputBorder()),
                child: Text(nickname.isEmpty ? '생성 중...' : nickname))),
              const SizedBox(width: 8),
              ElevatedButton(onPressed: _generateNickname, child: const Text('다시 생성')),
            ]),
            const SizedBox(height: 16),
            TextField(controller: birthCtrl,
              decoration: const InputDecoration(labelText: '생년월일 (YYYY-MM-DD)', border: OutlineInputBorder())),
            const SizedBox(height: 16),
            const Text('성별'),
            Row(children: [
              ChoiceChip(label: const Text('남'), selected: gender == 'MALE',
                onSelected: (_) => setState(() => gender = 'MALE')),
              const SizedBox(width: 8),
              ChoiceChip(label: const Text('여'), selected: gender == 'FEMALE',
                onSelected: (_) => setState(() => gender = 'FEMALE')),
            ]),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(labelText: '시/도', border: OutlineInputBorder()),
              controller: TextEditingController(text: sido),
              onChanged: (v) => sido = v),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(labelText: '시/군/구', border: OutlineInputBorder()),
              controller: TextEditingController(text: sigungu),
              onChanged: (v) => sigungu = v),
            const SizedBox(height: 16),
            TextField(controller: schoolCtrl,
              decoration: const InputDecoration(labelText: '학교 (선택)', border: OutlineInputBorder())),
            const SizedBox(height: 24),
            if (message != null) Text(message!, style: const TextStyle(color: Colors.redAccent)),
            SizedBox(width: double.infinity, height: 48,
              child: ElevatedButton(
                onPressed: nickname.isNotEmpty && realNameCtrl.text.isNotEmpty ? _submit : null,
                child: const Text('다음'))),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════
// 3.2 이상형 키워드 설정
// ══════════════════════════════════════
class IdealTypeScreen extends StatefulWidget {
  const IdealTypeScreen({super.key});

  @override
  State<IdealTypeScreen> createState() => _IdealTypeScreenState();
}

class _IdealTypeScreenState extends State<IdealTypeScreen> {
  final app = AppState();
  List<dynamic> keywords = [];
  Set<int> selected = {};
  String? message;

  @override
  void initState() {
    super.initState();
    _loadKeywords();
  }

  Future<void> _loadKeywords() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/users/ideal-type/keyword-list');
      setState(() => keywords = res.data['data']['keywords']);
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  Future<void> _submit() async {
    try {
      await app.dio.post('${app.baseUrl}/api/users/ideal-type/keywords',
        data: {'keywordIds': selected.toList()}, options: app.authHeaders);
      if (mounted) {
        Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => const TutorialScreen()));
      }
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('이상형 설정 (2/2)')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('어떤 성격의 사람을\n원하시나요?',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('${selected.length}/3 선택됨', style: const TextStyle(color: Colors.white54)),
            const SizedBox(height: 24),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: keywords.map((k) {
                final id = k['id'] as int;
                final isSelected = selected.contains(id);
                return FilterChip(
                  label: Text(k['label']),
                  selected: isSelected,
                  onSelected: (v) {
                    setState(() {
                      if (v && selected.length < 3) selected.add(id);
                      else selected.remove(id);
                    });
                  },
                );
              }).toList(),
            ),
            const Spacer(),
            if (message != null) Text(message!, style: const TextStyle(color: Colors.redAccent)),
            SizedBox(width: double.infinity, height: 48,
              child: ElevatedButton(
                onPressed: selected.isNotEmpty ? _submit : null,
                child: const Text('시작하기'))),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════
// 3.3 튜토리얼
// ══════════════════════════════════════
class TutorialScreen extends StatelessWidget {
  const TutorialScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final pages = [
      {'icon': '📝', 'title': '매일 일기 쓰기', 'desc': '하루를 돌아보며 일기를 작성해보세요'},
      {'icon': '🤖', 'title': 'AI가 추천하는 상대', 'desc': 'AI가 성격을 분석하고 맞는 상대를 추천해줍니다'},
      {'icon': '📖', 'title': '교환 일기로 관계 형성', 'desc': '서로 일기를 교환하며 내면을 알아가세요'},
      {'icon': '💬', 'title': '채팅으로 만남', 'desc': '교환이 끝나면 채팅으로 더 가까워지세요'},
    ];

    return Scaffold(
      body: PageView.builder(
        itemCount: pages.length,
        itemBuilder: (context, index) {
          final page = pages[index];
          return Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(pages.length, (i) => Container(
                    width: 8, height: 8,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: i == index ? Colors.orange : Colors.white24),
                  )),
                ),
                const Spacer(),
                Text(page['icon']!, style: const TextStyle(fontSize: 64)),
                const SizedBox(height: 24),
                Text(page['title']!, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Text(page['desc']!, style: const TextStyle(color: Colors.white54), textAlign: TextAlign.center),
                const Spacer(),
                if (index == pages.length - 1)
                  SizedBox(width: double.infinity, height: 48,
                    child: ElevatedButton(
                      onPressed: () async {
                        final app = AppState();
                        try {
                          await app.dio.post('${app.baseUrl}/api/users/tutorial/complete',
                            options: app.authHeaders);
                        } catch (_) {}
                        if (context.mounted) {
                          Navigator.pushReplacement(context,
                            MaterialPageRoute(builder: (_) => const HomeScreen()));
                        }
                      },
                      child: const Text('시작하기')))
                else
                  const Text('스와이프하여 다음 →', style: TextStyle(color: Colors.white38)),
                TextButton(
                  onPressed: () {
                    Navigator.pushReplacement(context,
                      MaterialPageRoute(builder: (_) => const HomeScreen()));
                  },
                  child: const Text('건너뛰기', style: TextStyle(color: Colors.white38))),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ══════════════════════════════════════
// 홈 화면 (4탭 구조)
// ══════════════════════════════════════
class HomeScreen extends StatefulWidget {
  final int initialTab;
  const HomeScreen({super.key, this.initialTab = 0});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late int _currentTab = widget.initialTab;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentTab,
        children: const [
          DiaryUnifiedTab(),
          ExploreTab(),
          CommunicationTab(),
          MoreTab(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentTab,
        onTap: (i) => setState(() => _currentTab = i),
        type: BottomNavigationBarType.fixed,
        selectedFontSize: 11,
        unselectedFontSize: 10,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.auto_stories), label: '일기'),
          BottomNavigationBarItem(icon: Icon(Icons.explore), label: '탐색'),
          BottomNavigationBarItem(icon: Icon(Icons.forum), label: '소통'),
          BottomNavigationBarItem(icon: Icon(Icons.more_horiz), label: '더보기'),
        ],
      ),
    );
  }
}

// ── 일기 통합 탭 (작성 / 히스토리 / 임시저장) ──
class DiaryUnifiedTab extends StatefulWidget {
  const DiaryUnifiedTab({super.key});

  @override
  State<DiaryUnifiedTab> createState() => _DiaryUnifiedTabState();
}

class _DiaryUnifiedTabState extends State<DiaryUnifiedTab> {
  int _subIndex = 0;

  static const _labels = ['작성', '히스토리', '임시저장'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🔥 일기'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: SegmentedButton<int>(
              segments: List.generate(_labels.length, (i) =>
                ButtonSegment<int>(value: i, label: Text(_labels[i]))),
              selected: {_subIndex},
              onSelectionChanged: (s) => setState(() => _subIndex = s.first),
              style: const ButtonStyle(
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ),
        ),
      ),
      body: IndexedStack(
        index: _subIndex,
        children: const [
          _DiaryWriteBody(),
          _DiaryHistoryBody(),
          _DraftBody(),
        ],
      ),
    );
  }
}

// ── 소통 통합 탭 (교환일기 / 채팅) ──
class CommunicationTab extends StatefulWidget {
  const CommunicationTab({super.key});

  @override
  State<CommunicationTab> createState() => _CommunicationTabState();
}

class _CommunicationTabState extends State<CommunicationTab> {
  int _subIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('소통'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: SegmentedButton<int>(
              segments: const [
                ButtonSegment<int>(value: 0, label: Text('교환일기'), icon: Icon(Icons.swap_horiz, size: 16)),
                ButtonSegment<int>(value: 1, label: Text('채팅'), icon: Icon(Icons.chat_bubble, size: 16)),
              ],
              selected: {_subIndex},
              onSelectionChanged: (s) => setState(() => _subIndex = s.first),
              style: const ButtonStyle(
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ),
        ),
      ),
      body: IndexedStack(
        index: _subIndex,
        children: const [
          _ExchangeBody(),
          _ChatBody(),
        ],
      ),
    );
  }
}

// ── 일기 작성 바디 래퍼 (DiaryUnifiedTab 내부용) ──
class _DiaryWriteBody extends StatelessWidget {
  const _DiaryWriteBody();
  @override
  Widget build(BuildContext context) => const DiaryWriteTab(standaloneAppBar: false);
}

// ── 4.1 일기 작성 탭 ──
class DiaryWriteTab extends StatefulWidget {
  final bool standaloneAppBar;
  const DiaryWriteTab({super.key, this.standaloneAppBar = true});

  @override
  State<DiaryWriteTab> createState() => _DiaryWriteTabState();
}

class _DiaryWriteTabState extends State<DiaryWriteTab> {
  final app = AppState();
  final contentCtrl = TextEditingController();
  bool? todayExists;
  int? todayDiaryId;
  String? message;
  bool isEdit = false;
  String? weeklyTopic;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await Future.wait([_checkToday(), _loadWeeklyTopic()]);
    if (todayExists != true) {
      await _checkDrafts();
    }
  }

  Future<void> _loadWeeklyTopic() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/diaries/weekly-topic', options: app.authHeaders);
      final data = res.data['data'];
      if (data != null && data['topic'] != null) {
        setState(() => weeklyTopic = data['topic']);
      }
    } catch (_) {}
  }

  Future<void> _checkToday() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/diaries/today', options: app.authHeaders);
      final data = res.data['data'];
      setState(() {
        todayExists = data['exists'];
        todayDiaryId = data['diaryId'];
      });
      if (todayExists == true && todayDiaryId != null) {
        final detail = await app.dio.get('${app.baseUrl}/api/diaries/$todayDiaryId', options: app.authHeaders);
        contentCtrl.text = detail.data['data']['content'];
        setState(() => isEdit = detail.data['data']['isEditable']);
      }
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  Future<void> _checkDrafts() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/diaries/drafts', options: app.authHeaders);
      final drafts = res.data['data']['drafts'] as List;
      if (drafts.isNotEmpty && mounted) {
        final latest = drafts.first;
        final result = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('임시저장된 일기가 있어요'),
            content: Text('${latest['content'].toString().substring(0, latest['content'].toString().length > 50 ? 50 : latest['content'].toString().length)}...\n\n이어서 작성하시겠어요?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('새로 시작')),
              ElevatedButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('이어쓰기')),
            ],
          ),
        );
        if (result == true) {
          contentCtrl.text = latest['content'];
          setState(() {});
        }
      }
    } catch (_) {}
  }

  Future<void> _submit() async {
    try {
      if (todayExists == true && todayDiaryId != null) {
        await app.dio.patch('${app.baseUrl}/api/diaries/$todayDiaryId',
          data: {'content': contentCtrl.text}, options: app.authHeaders);
        setState(() => message = '일기 수정 완료!');
      } else {
        final res = await app.dio.post('${app.baseUrl}/api/diaries',
          data: {'content': contentCtrl.text, 'visibility': 'PRIVATE'}, options: app.authHeaders);
        final diaryId = res.data['data']['diaryId'];
        setState(() {
          message = '일기 작성 완료! (id=$diaryId)';
          todayExists = true;
          todayDiaryId = diaryId;
        });
        // AI 분석 자동 트리거 (2초 딜레이)
        Future.delayed(const Duration(seconds: 2), () async {
          try {
            await app.dio.post('${app.baseUrl}/api/dev/ai/simulate/$diaryId');
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('AI 분석 시작됨'), duration: Duration(seconds: 2)));
            }
          } catch (_) {}
        });
      }
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  Future<void> _saveDraft() async {
    try {
      await app.dio.post('${app.baseUrl}/api/diaries/draft',
        data: {'content': contentCtrl.text}, options: app.authHeaders);
      setState(() => message = '임시저장 완료!');
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final charCount = contentCtrl.text.length;

    return Scaffold(
      appBar: widget.standaloneAppBar ? AppBar(
        title: Text('${now.month}월 ${now.day}일 (${['월','화','수','목','금','토','일'][now.weekday - 1]})'),
        actions: [
          if (todayExists == true)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Chip(label: Text('작성됨', style: TextStyle(fontSize: 11))),
            ),
        ],
      ) : null,
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 주간 주제 표시
            if (weeklyTopic != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.orange.withOpacity(0.3)),
                ),
                child: Row(children: [
                  const Icon(Icons.lightbulb_outline, color: Colors.orange, size: 18),
                  const SizedBox(width: 8),
                  Expanded(child: Text('이번 주 주제: $weeklyTopic',
                    style: const TextStyle(color: Colors.orange, fontSize: 13))),
                ]),
              ),
            Expanded(
              child: TextField(
                controller: contentCtrl,
                maxLines: null,
                expands: true,
                textAlignVertical: TextAlignVertical.top,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  hintText: '오늘 하루를 돌아보며 일기를 써보세요... (200~1,000자)',
                  border: OutlineInputBorder(),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Text('$charCount / 1000자',
                  style: TextStyle(
                    color: charCount >= 200 && charCount <= 1000
                      ? Colors.greenAccent : Colors.redAccent)),
                const Spacer(),
                TextButton(onPressed: _saveDraft, child: const Text('임시저장')),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: charCount >= 200 && charCount <= 1000
                    ? _submit : null,
                  child: Text(todayExists == true ? '수정' : '제출')),
              ],
            ),
            if (message != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(message!, style: TextStyle(
                  color: message!.contains('완료') ? Colors.greenAccent : Colors.redAccent)),
              ),
          ],
        ),
      ),
    );
  }
}

// ── 일기 히스토리 바디 래퍼 ──
class _DiaryHistoryBody extends StatelessWidget {
  const _DiaryHistoryBody();
  @override
  Widget build(BuildContext context) => const DiaryHistoryTab(standaloneAppBar: false);
}

// ── 4.4 일기 히스토리 탭 ──
class DiaryHistoryTab extends StatefulWidget {
  final bool standaloneAppBar;
  const DiaryHistoryTab({super.key, this.standaloneAppBar = true});

  @override
  State<DiaryHistoryTab> createState() => _DiaryHistoryTabState();
}

class _DiaryHistoryTabState extends State<DiaryHistoryTab> {
  final app = AppState();
  List<dynamic> diaries = [];
  String? message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/diaries', options: app.authHeaders);
      setState(() => diaries = res.data['data']['diaries']);
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.standaloneAppBar ? AppBar(title: const Text('나의 일기')) : null,
      body: diaries.isEmpty
        ? Center(child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.book_outlined, size: 64, color: Colors.white24),
              const SizedBox(height: 12),
              Text(message ?? '아직 일기가 없어요', style: const TextStyle(color: Colors.white54)),
              const SizedBox(height: 8),
              const Text('오늘의 일기를 작성해보세요', style: TextStyle(color: Colors.white38, fontSize: 13)),
            ],
          ))
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: diaries.length,
              itemBuilder: (context, index) {
                final d = diaries[index];
                return Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    title: Text(d['contentPreview'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                    subtitle: Row(children: [
                      Text(d['createdAt']?.toString().substring(0, 10) ?? ''),
                      if (d['summary'] != null) ...[
                        const SizedBox(width: 8),
                        Chip(label: Text(d['category'] ?? '', style: const TextStyle(fontSize: 10))),
                      ],
                    ]),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () async {
                      try {
                        final res = await app.dio.get(
                          '${app.baseUrl}/api/diaries/${d['diaryId']}', options: app.authHeaders);
                        if (context.mounted) {
                          Navigator.push(context, MaterialPageRoute(
                            builder: (_) => DiaryDetailScreen(diary: res.data['data'])));
                        }
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(app.errMsg(e))));
                        }
                      }
                    },
                  ),
                );
              },
            ),
          ),
    );
  }
}

// ── 4.4 일기 상세 ──
class DiaryDetailScreen extends StatelessWidget {
  final Map<String, dynamic> diary;
  const DiaryDetailScreen({super.key, required this.diary});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(diary['createdAt']?.toString().substring(0, 10) ?? ''),
        actions: [
          if (diary['isEditable'] == true)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Chip(label: Text('수정 가능', style: TextStyle(fontSize: 11, color: Colors.greenAccent))),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(diary['content'] ?? '', style: const TextStyle(fontSize: 16, height: 1.6)),
            const Divider(height: 32),
            if (diary['summary'] != null)
              _tag('AI 요약', diary['summary']),
            if (diary['category'] != null)
              _tag('카테고리', diary['category']),
            if (diary['emotionTags'] != null)
              _tagList('감정', diary['emotionTags']),
            if (diary['lifestyleTags'] != null)
              _tagList('라이프스타일', diary['lifestyleTags']),
            if (diary['toneTags'] != null)
              _tagList('글쓰기 톤', diary['toneTags']),
            if (diary['summary'] == null)
              const Text('AI 분석 대기 중...', style: TextStyle(color: Colors.white38)),
          ],
        ),
      ),
    );
  }

  Widget _tag(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(children: [
      Text('$label: ', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white54)),
      Expanded(child: Text(value)),
    ]),
  );

  Widget _tagList(String label, List<dynamic> tags) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white54)),
        const SizedBox(height: 4),
        Wrap(spacing: 6, children: tags.map((t) =>
          Chip(label: Text('${t['label']}', style: const TextStyle(fontSize: 12)))).toList()),
      ],
    ),
  );
}

// ── 임시저장 바디 래퍼 ──
class _DraftBody extends StatelessWidget {
  const _DraftBody();
  @override
  Widget build(BuildContext context) => const DraftTab(standaloneAppBar: false);
}

// ── 임시저장 탭 ──
class DraftTab extends StatefulWidget {
  final bool standaloneAppBar;
  const DraftTab({super.key, this.standaloneAppBar = true});

  @override
  State<DraftTab> createState() => _DraftTabState();
}

class _DraftTabState extends State<DraftTab> {
  final app = AppState();
  List<dynamic> drafts = [];
  String? message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/diaries/drafts', options: app.authHeaders);
      setState(() => drafts = res.data['data']['drafts']);
    } catch (e) {
      setState(() => message = app.errMsg(e));
    }
  }

  Future<void> _deleteDraft(int draftId) async {
    try {
      await app.dio.delete('${app.baseUrl}/api/diaries/draft/$draftId', options: app.authHeaders);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.standaloneAppBar ? AppBar(title: Text('임시저장 (${drafts.length}/3)')) : null,
      body: drafts.isEmpty
        ? Center(child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.drafts_outlined, size: 64, color: Colors.white24),
              const SizedBox(height: 12),
              Text(message ?? '임시저장된 일기가 없어요', style: const TextStyle(color: Colors.white54)),
            ],
          ))
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: drafts.length,
              itemBuilder: (context, index) {
                final d = drafts[index];
                return Dismissible(
                  key: Key('${d['draftId']}'),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    color: Colors.red, alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    child: const Icon(Icons.delete, color: Colors.white)),
                  onDismissed: (_) => _deleteDraft(d['draftId']),
                  child: Card(
                    child: ListTile(
                      title: Text(d['content'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                      subtitle: Text(d['savedAt']?.toString().substring(0, 16) ?? ''),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                            onPressed: () => _deleteDraft(d['draftId']),
                          ),
                          const Text('← 밀어서 삭제', style: TextStyle(fontSize: 10, color: Colors.white38)),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
    );
  }
}

// ══════════════════════════════════════
// 도메인 5. 매칭 탐색
// ══════════════════════════════════════

// ── 5.1 일기 탐색 탭 ──
class ExploreTab extends StatefulWidget {
  const ExploreTab({super.key});

  @override
  State<ExploreTab> createState() => _ExploreTabState();
}

class _ExploreTabState extends State<ExploreTab> {
  final app = AppState();
  List<dynamic> diaries = [];
  int? nextCursor;
  bool loading = false;
  String? message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final res = await app.dio.get('${app.baseUrl}/api/diaries/explore',
        options: app.authHeaders,
        queryParameters: nextCursor != null ? {'cursor': nextCursor} : null);
      final data = res.data['data'];
      setState(() {
        diaries = data['diaries'] ?? [];
        nextCursor = data['nextCursor'];
        message = data['guidanceMessage'];
        loading = false;
      });
    } catch (e) {
      setState(() { message = app.errMsg(e); loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('일기 탐색'),
        actions: [
          IconButton(icon: const Icon(Icons.recommend), onPressed: _showAiRecommendations, tooltip: 'AI 추천'),
          IconButton(icon: const Icon(Icons.mail), onPressed: _showReceivedRequests),
          IconButton(icon: const Icon(Icons.analytics), onPressed: _showLifestyleReport),
        ],
      ),
      body: loading
        ? const Center(child: CircularProgressIndicator())
        : diaries.isEmpty
          ? Center(child: Text(message ?? '탐색할 일기가 없습니다', style: const TextStyle(color: Colors.white54)))
          : RefreshIndicator(
              onRefresh: () async { nextCursor = null; await _load(); },
              child: ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: diaries.length,
                itemBuilder: (context, index) {
                  final d = diaries[index];
                  return Card(
                    child: ListTile(
                      title: Text(d['previewContent'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                      subtitle: Row(children: [
                        Text('${d['ageGroupLabel'] ?? ''} · ${d['region'] ?? ''}'),
                        if (d['similarityBadge'] != null) ...[
                          const SizedBox(width: 8),
                          Chip(label: Text(d['similarityBadge'], style: const TextStyle(fontSize: 10))),
                        ],
                      ]),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => _showDiaryDetail(d),
                    ),
                  );
                },
              ),
            ),
    );
  }

  void _showDiaryDetail(Map<String, dynamic> d) async {
    try {
      // 상세 API 사용
      final detailRes = await app.dio.get(
        '${app.baseUrl}/api/diaries/${d['diaryId']}/detail',
        options: app.authHeaders);
      if (context.mounted) {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => ExploreDetailScreen(
            diaryId: d['diaryId'],
            preview: detailRes.data['data'])));
      }
    } catch (e) {
      // detail 실패 시 preview 폴백
      try {
        final previewRes = await app.dio.get(
          '${app.baseUrl}/api/matching/recommendations/${d['diaryId']}/preview',
          options: app.authHeaders);
        if (context.mounted) {
          Navigator.push(context, MaterialPageRoute(
            builder: (_) => ExploreDetailScreen(
              diaryId: d['diaryId'],
              preview: previewRes.data['data'])));
        }
      } catch (e2) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e2))));
        }
      }
    }
  }

  void _showAiRecommendations() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/matching/recommendations',
        options: app.authHeaders);
      if (context.mounted) {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => AiRecommendationsScreen(data: res.data['data'])));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
      }
    }
  }

  void _showReceivedRequests() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/matching/requests',
        options: app.authHeaders);
      if (context.mounted) {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => ReceivedRequestsScreen(requests: res.data['data'] ?? [])));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
      }
    }
  }

  void _showLifestyleReport() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/matching/lifestyle-report',
        options: app.authHeaders);
      if (context.mounted) {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => LifestyleReportScreen(data: res.data['data'])));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
      }
    }
  }
}

// ── AI 추천 목록 화면 ──
class AiRecommendationsScreen extends StatelessWidget {
  final dynamic data;
  const AiRecommendationsScreen({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final app = AppState();
    final recommendations = (data is Map && data['recommendations'] != null)
      ? data['recommendations'] as List
      : (data is List ? data : []);

    return Scaffold(
      appBar: AppBar(title: const Text('AI 추천')),
      body: recommendations.isEmpty
        ? Center(child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.recommend, size: 64, color: Colors.white24),
              const SizedBox(height: 12),
              Text(data is Map && data['guidanceMessage'] != null
                ? data['guidanceMessage'] : 'AI 추천 결과가 없습니다',
                style: const TextStyle(color: Colors.white54),
                textAlign: TextAlign.center),
            ],
          ))
        : ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: recommendations.length,
            itemBuilder: (context, index) {
              final r = recommendations[index];
              return Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.orange.withOpacity(0.2),
                    child: Text('${index + 1}', style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold)),
                  ),
                  title: Text(r['previewContent'] ?? r['preview'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                  subtitle: Row(children: [
                    Text('${r['ageGroupLabel'] ?? r['ageGroup'] ?? ''} · ${r['region'] ?? ''}'),
                    if (r['matchScore'] != null) ...[
                      const SizedBox(width: 8),
                      Chip(
                        label: Text('${(r['matchScore'] * 100).toStringAsFixed(0)}%',
                          style: const TextStyle(fontSize: 10)),
                        backgroundColor: Colors.green.withOpacity(0.2)),
                    ],
                  ]),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () async {
                    final diaryId = r['diaryId'];
                    if (diaryId == null) return;
                    try {
                      final res = await app.dio.get(
                        '${app.baseUrl}/api/matching/recommendations/$diaryId/preview',
                        options: app.authHeaders);
                      if (context.mounted) {
                        Navigator.push(context, MaterialPageRoute(
                          builder: (_) => ExploreDetailScreen(diaryId: diaryId, preview: res.data['data'])));
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
                      }
                    }
                  },
                ),
              );
            },
          ),
    );
  }
}

// ── 받은 매칭 요청 화면 ──
class ReceivedRequestsScreen extends StatefulWidget {
  final List<dynamic> requests;
  const ReceivedRequestsScreen({super.key, required this.requests});

  @override
  State<ReceivedRequestsScreen> createState() => _ReceivedRequestsScreenState();
}

class _ReceivedRequestsScreenState extends State<ReceivedRequestsScreen> {
  final app = AppState();
  late List<dynamic> requests;

  @override
  void initState() {
    super.initState();
    requests = widget.requests;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('받은 요청 (${requests.length})')),
      body: requests.isEmpty
        ? const Center(child: Text('받은 매칭 요청이 없습니다', style: TextStyle(color: Colors.white54)))
        : ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: requests.length,
            itemBuilder: (context, index) {
              final r = requests[index];
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.person)),
                  title: Text('${r['fromUserNickname'] ?? '익명'} (${r['fromUserAgeGroup'] ?? ''})'),
                  subtitle: Text(r['diaryPreview'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.check_circle, color: Colors.greenAccent),
                        onPressed: () => _accept(r['matchingId'], index),
                      ),
                      IconButton(
                        icon: const Icon(Icons.cancel, color: Colors.redAccent),
                        onPressed: () => _reject(index),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
    );
  }

  void _accept(int matchingId, int index) async {
    try {
      final res = await app.dio.post(
        '${app.baseUrl}/api/matching/requests/$matchingId/accept',
        options: app.authHeaders);
      setState(() => requests.removeAt(index));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('매칭 성사! 교환일기 방으로 이동합니다.'),
          duration: Duration(seconds: 2)));
        Navigator.pushAndRemoveUntil(context,
          MaterialPageRoute(builder: (_) => const HomeScreen(initialTab: 2)),
          (_) => false);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
      }
    }
  }

  void _reject(int index) {
    setState(() => requests.removeAt(index));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('요청을 거절했습니다')));
  }
}

// ── 5.2 블라인드 미리보기 + 5.4 선택/넘기기 ──
class ExploreDetailScreen extends StatelessWidget {
  final int diaryId;
  final Map<String, dynamic> preview;
  const ExploreDetailScreen({super.key, required this.diaryId, required this.preview});

  @override
  Widget build(BuildContext context) {
    final app = AppState();
    return Scaffold(
      appBar: AppBar(title: Text('${preview['ageGroup'] ?? ''} · 일기 미리보기')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(preview['preview'] ?? preview['content'] ?? '', style: const TextStyle(fontSize: 16, height: 1.6)),
            const SizedBox(height: 16),
            if (preview['aiIntro'] != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8)),
                child: Text('AI: ${preview['aiIntro']}', style: const TextStyle(color: Colors.orange)),
              ),
            const SizedBox(height: 12),
            if (preview['keywords'] != null)
              Wrap(spacing: 6, children: (preview['keywords'] as List).map((k) =>
                Chip(label: Text(k is String ? k : k['label'] ?? '', style: const TextStyle(fontSize: 12)))).toList()),
            if (preview['personalityKeywords'] != null)
              Wrap(spacing: 6, children: (preview['personalityKeywords'] as List).map((k) =>
                Chip(label: Text(k is String ? k : k['label'] ?? '', style: const TextStyle(fontSize: 12)),
                  backgroundColor: Colors.purple.withOpacity(0.2))).toList()),
            if (preview['tags'] != null)
              Wrap(spacing: 6, children: (preview['tags'] as List).map((t) =>
                Chip(label: Text('#$t', style: const TextStyle(fontSize: 11)),
                  backgroundColor: Colors.deepPurple)).toList()),
            const SizedBox(height: 12),
            if (preview['category'] != null)
              Text('카테고리: ${preview['category']}', style: const TextStyle(color: Colors.white54)),
            if (preview['matchScore'] != null)
              Text('유사도: ${(preview['matchScore'] * 100).toStringAsFixed(0)}%',
                style: const TextStyle(color: Colors.greenAccent)),
            // 작성자의 다른 일기
            if (preview['otherDiaries'] != null && (preview['otherDiaries'] as List).isNotEmpty) ...[
              const SizedBox(height: 20),
              const Divider(),
              const Text('작성자의 다른 일기', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white54)),
              const SizedBox(height: 8),
              ...(preview['otherDiaries'] as List).map((od) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Card(
                  child: ListTile(
                    dense: true,
                    title: Text(od['contentPreview'] ?? od['preview'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                    subtitle: Text(od['createdAt']?.toString().substring(0, 10) ?? ''),
                  ),
                ),
              )),
            ],
          ],
        ),
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Expanded(
            child: OutlinedButton.icon(
              icon: const Icon(Icons.skip_next),
              label: const Text('다음 일기'),
              onPressed: () async {
                try {
                  await app.dio.post('${app.baseUrl}/api/matching/$diaryId/skip',
                    options: app.authHeaders);
                  if (context.mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('넘기기 완료 (7일간 재추천 제외)')));
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
                  }
                }
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              icon: const Icon(Icons.mail_outline),
              label: const Text('교환 신청'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.deepOrange),
              onPressed: () async {
                try {
                  final res = await app.dio.post('${app.baseUrl}/api/matching/$diaryId/select',
                    options: app.authHeaders);
                  final data = res.data['data'];
                  if (context.mounted) {
                    if (data['isMatched'] == true) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                        content: Text('매칭 성사! 교환일기 방으로 이동합니다.'),
                        duration: Duration(seconds: 2)));
                      Navigator.pushAndRemoveUntil(context,
                        MaterialPageRoute(builder: (_) => const HomeScreen()),
                        (_) => false);
                    } else {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text('교환 신청 완료! 상대방 응답을 기다려주세요 (id: ${data['matchingId']})'),
                        duration: const Duration(seconds: 3)));
                    }
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
                  }
                }
              },
            ),
          ),
        ]),
      ),
    );
  }
}

// ── 5.3 라이프스타일 리포트 ──
class LifestyleReportScreen extends StatelessWidget {
  final Map<String, dynamic> data;
  const LifestyleReportScreen({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final available = data['analysisAvailable'] == true;
    return Scaffold(
      appBar: AppBar(title: const Text('나의 라이프 리포트')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: available ? _buildReport() : _buildUnavailable(),
      ),
    );
  }

  Widget _buildUnavailable() {
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.analytics_outlined, size: 64, color: Colors.white38),
        const SizedBox(height: 16),
        Text(data['guidanceMessage'] ?? '일기를 더 작성해주세요',
          style: const TextStyle(fontSize: 16, color: Colors.white54)),
        const SizedBox(height: 8),
        Text('현재 ${data['currentDiaryCount']}편 / 필요 ${data['requiredDiaryCount']}편',
          style: const TextStyle(color: Colors.white38)),
      ]),
    );
  }

  Widget _buildReport() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _section('평균 일기 길이', '${data['avgDiaryLength'] ?? 0}자'),
      if (data['weekdayPattern'] != null)
        _section('작성 패턴', '평일 ${data['weekdayPattern']['weekday']}편 / 주말 ${data['weekdayPattern']['weekend']}편'),
      if (data['commonKeywords'] != null && (data['commonKeywords'] as List).isNotEmpty)
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('자주 쓰는 키워드', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white54)),
          const SizedBox(height: 8),
          Wrap(spacing: 6, children: (data['commonKeywords'] as List).map((k) =>
            Chip(label: Text('#$k', style: const TextStyle(fontSize: 12)))).toList()),
          const SizedBox(height: 16),
        ]),
      if (data['lifestyleTags'] != null && (data['lifestyleTags'] as List).isNotEmpty)
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('라이프스타일 태그', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white54)),
          const SizedBox(height: 8),
          Wrap(spacing: 6, children: (data['lifestyleTags'] as List).map((t) =>
            Chip(label: Text(t, style: const TextStyle(fontSize: 12)),
              backgroundColor: Colors.teal)).toList()),
        ]),
      if (data['aiDescription'] != null) ...[
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.orange.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8)),
          child: Text('AI 분석: ${data['aiDescription']}', style: const TextStyle(color: Colors.orange)),
        ),
      ],
    ]);
  }

  Widget _section(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Row(children: [
      Text('$label: ', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white54)),
      Text(value, style: const TextStyle(fontSize: 16)),
    ]),
  );
}

// ══════════════════════════════════════
// 더보기 탭
// ══════════════════════════════════════
class MoreTab extends StatefulWidget {
  const MoreTab({super.key});

  @override
  State<MoreTab> createState() => _MoreTabState();
}

typedef SettingsTab = MoreTab;

class _MoreTabState extends State<MoreTab> {
  final app = AppState();

  void _snack(String msg) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  void _showJson(String title, dynamic data) {
    if (!mounted) return;
    showDialog(context: context, builder: (_) => AlertDialog(
      title: Text(title),
      content: SingleChildScrollView(
        child: Text(const JsonEncoder.withIndent('  ').convert(data), style: const TextStyle(fontSize: 12)),
      ),
      actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('닫기'))],
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('더보기')),
      body: ListView(
        children: [
          // ── 프로필 ──
          const Padding(padding: EdgeInsets.all(12), child: Text('프로필', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('내 프로필'), leading: const Icon(Icons.person),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me', options: app.authHeaders);
                if (mounted) {
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => MyProfileScreen(profile: res.data['data'])));
                }
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('AI 프로필 (성격 분석)'), leading: const Icon(Icons.psychology),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me/ai-profile', options: app.authHeaders);
                if (mounted) {
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => AiProfileScreen(data: res.data['data'])));
                }
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('이상형 키워드'), leading: const Icon(Icons.favorite),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me/ideal-type', options: app.authHeaders);
                if (mounted) {
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => IdealTypeViewScreen(data: res.data['data'])));
                }
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),

          // ── 알림 ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('알림', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('알림 목록'), leading: const Icon(Icons.notifications),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/notifications', options: app.authHeaders);
                if (mounted) {
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => NotificationListScreen(data: res.data['data'])));
                }
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('알림 설정'), leading: const Icon(Icons.notifications_active),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me/notification-settings', options: app.authHeaders);
                if (mounted) {
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => NotificationSettingsScreen(settings: res.data['data'])));
                }
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),

          // ── 신고/차단 ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('신고/차단', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('차단 목록'), leading: const Icon(Icons.block),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me/block-list', options: app.authHeaders);
                if (mounted) {
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => BlockListScreen(data: res.data['data'])));
                }
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('사용자 신고 (상대방)'), leading: const Icon(Icons.report),
            onTap: () => _showReportDialog(),
          ),
          ListTile(
            title: const Text('사용자 차단 (상대방)'), leading: const Icon(Icons.person_off),
            onTap: () => _showBlockDialog(),
          ),

          // ── 히스토리 ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('히스토리', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('교환일기 히스토리'), leading: const Icon(Icons.history),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me/history/exchange-rooms', options: app.authHeaders);
                if (mounted) {
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => ExchangeHistoryScreen(data: res.data['data'])));
                }
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('채팅 히스토리'), leading: const Icon(Icons.chat_bubble_outline),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/users/me/history/chat-rooms', options: app.authHeaders);
                if (mounted) {
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => ChatHistoryScreen(data: res.data['data'])));
                }
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),

          // ── AI 테스트 (Dev) ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('AI 파이프라인 (Dev)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.amber))),
          ListTile(
            title: const Text('AI 분석 시뮬레이션'), leading: const Icon(Icons.science, color: Colors.amber),
            subtitle: const Text('diaryId 입력 -> 가짜 AI 결과 생성'),
            onTap: () => _showAiSimulateDialog(),
          ),

          // ── Redis 모니터링 (Dev) ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('Redis 캐시 (Dev)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.amber))),
          ListTile(
            title: const Text('캐시 요약'), leading: const Icon(Icons.dashboard, color: Colors.amber),
            subtitle: const Text('전체 캐시 키 수/메모리 현황'),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/dev/redis/summary');
                _showJson('Redis 요약', res.data);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('내 캐시 현황'), leading: const Icon(Icons.person_search, color: Colors.amber),
            subtitle: const Text('내 userId 기준 캐시 키 목록'),
            onTap: () async {
              if (app.userId == null) { _snack('로그인 후 이용하세요'); return; }
              try {
                final res = await app.dio.get('${app.baseUrl}/api/dev/redis/user/${app.userId}');
                _showJson('내 캐시 (userId=${app.userId})', res.data);
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('키 직접 조회'), leading: const Icon(Icons.search, color: Colors.amber),
            subtitle: const Text('key 입력 → 값 조회'),
            onTap: () => _showRedisGetDialog(),
          ),
          ListTile(
            title: const Text('키 삭제'), leading: const Icon(Icons.delete_outline, color: Colors.amber),
            subtitle: const Text('key 입력 → 캐시 삭제'),
            onTap: () => _showRedisDeleteDialog(),
          ),
          ListTile(
            title: const Text('패턴 검색'), leading: const Icon(Icons.filter_list, color: Colors.amber),
            subtitle: const Text('pattern 입력 (예: AI:DIARY:*) → 키 목록'),
            onTap: () => _showRedisPatternDialog(),
          ),

          // ── 공지/FAQ ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('공지/지원', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('공지사항'), leading: const Icon(Icons.campaign),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/notices', options: app.authHeaders);
                if (mounted) {
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => NoticeListScreen(data: res.data['data'])));
                }
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('FAQ'), leading: const Icon(Icons.help),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/faq', options: app.authHeaders);
                if (mounted) {
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => FaqScreen(data: res.data['data'])));
                }
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('1:1 문의 접수'), leading: const Icon(Icons.support_agent),
            onTap: () => _showInquiryDialog(),
          ),
          ListTile(
            title: const Text('내 문의 목록'), leading: const Icon(Icons.list_alt),
            onTap: () async {
              try {
                final res = await app.dio.get('${app.baseUrl}/api/support/inquiries', options: app.authHeaders);
                if (mounted) {
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => InquiryListScreen(data: res.data['data'])));
                }
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),

          // ── 앱 설정 ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('앱 설정', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('설정 관리'), leading: const Icon(Icons.settings),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AppSettingsScreen())),
          ),

          // ── 계정 ──
          const Divider(),
          const Padding(padding: EdgeInsets.all(12), child: Text('계정', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
          ListTile(
            title: const Text('토큰 갱신'), leading: const Icon(Icons.refresh),
            onTap: () async {
              try {
                final res = await app.dio.post('${app.baseUrl}/api/auth/refresh',
                  data: {'refreshToken': app.refreshToken});
                app.accessToken = res.data['data']['accessToken'];
                app.refreshToken = res.data['data']['refreshToken'];
                _snack('토큰 갱신 성공!');
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('이의신청'), leading: const Icon(Icons.gavel),
            onTap: () => _showAppealDialog(),
          ),
          ListTile(
            title: const Text('AI 동의 철회'), leading: const Icon(Icons.privacy_tip),
            onTap: () => _showAiConsentRevokeDialog(),
          ),
          ListTile(
            title: const Text('로그아웃', style: TextStyle(color: Colors.red)),
            leading: const Icon(Icons.logout, color: Colors.red),
            onTap: () {
              showDialog(context: context, builder: (_) => AlertDialog(
                title: const Text('로그아웃'),
                content: const Text('정말 로그아웃 하시겠어요?'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
                  TextButton(
                    onPressed: () async {
                      try {
                        await app.dio.post('${app.baseUrl}/api/auth/logout', options: app.authHeaders);
                      } catch (_) {}
                      app.accessToken = null;
                      app.refreshToken = null;
                      if (context.mounted) {
                        Navigator.pop(context);
                        Navigator.pushAndRemoveUntil(context,
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                          (_) => false);
                      }
                    },
                    child: const Text('로그아웃', style: TextStyle(color: Colors.red))),
                ],
              ));
            },
          ),
          ListTile(
            title: const Text('계정 복구 (탈퇴 유예 중일 때)'), leading: const Icon(Icons.restore),
            onTap: () async {
              try {
                await app.dio.post('${app.baseUrl}/api/users/me/restore', options: app.authHeaders);
                _snack('계정 복구 완료!');
              } catch (e) { _snack(app.errMsg(e)); }
            },
          ),
          ListTile(
            title: const Text('회원 탈퇴 (30일 유예)', style: TextStyle(color: Colors.red)),
            leading: const Icon(Icons.delete_forever, color: Colors.red),
            onTap: () {
              showDialog(context: context, builder: (_) => AlertDialog(
                title: const Text('회원 탈퇴'),
                content: const Text('30일 유예 기간 후 영구 삭제됩니다.\n정말 탈퇴하시겠어요?'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
                  TextButton(
                    onPressed: () async {
                      Navigator.pop(context);
                      try {
                        await app.dio.post('${app.baseUrl}/api/users/me/deactivate',
                          data: {'reason': 'SERVICE_DISSATISFACTION'}, options: app.authHeaders);
                        _snack('탈퇴 처리 완료 (30일 유예)');
                      } catch (e) { _snack(app.errMsg(e)); }
                    },
                    child: const Text('탈퇴', style: TextStyle(color: Colors.red))),
                ],
              ));
            },
          ),
        ],
      ),
    );
  }

  void _showReportDialog() {
    final targetCtrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('사용자 신고'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: targetCtrl, decoration: const InputDecoration(labelText: '대상 userId'), keyboardType: TextInputType.number),
        const SizedBox(height: 8),
        const Text('사유: HARASSMENT', style: TextStyle(fontSize: 12, color: Colors.grey)),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          final targetId = targetCtrl.text.trim();
          if (targetId.isEmpty) return;
          try {
            final res = await app.dio.post('${app.baseUrl}/api/users/$targetId/report',
              data: {'reason': 'HARASSMENT'}, options: app.authHeaders);
            _snack('신고 접수 완료: ID=${res.data['data']['reportId']}');
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('신고')),
      ],
    ));
  }

  void _showBlockDialog() {
    final targetCtrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('사용자 차단'),
      content: TextField(controller: targetCtrl, decoration: const InputDecoration(labelText: '대상 userId'), keyboardType: TextInputType.number),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          final targetId = targetCtrl.text.trim();
          if (targetId.isEmpty) return;
          try {
            await app.dio.post('${app.baseUrl}/api/users/$targetId/block', options: app.authHeaders);
            _snack('차단 완료');
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('차단', style: TextStyle(color: Colors.red))),
      ],
    ));
  }

  void _showAppealDialog() {
    final reasonCtrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('제재 이의신청'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(
          controller: reasonCtrl,
          decoration: const InputDecoration(labelText: '사유 (20~500자)', border: OutlineInputBorder()),
          maxLines: 5,
        ),
        const SizedBox(height: 8),
        const Text('이의신청은 한 번만 가능합니다.', style: TextStyle(fontSize: 12, color: Colors.grey)),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          final reason = reasonCtrl.text.trim();
          if (reason.length < 20) { _snack('20자 이상 입력해주세요'); return; }
          try {
            final res = await app.dio.post('${app.baseUrl}/api/users/me/appeals',
              data: {'reason': reason}, options: app.authHeaders);
            _snack('이의신청 접수 완료: ID=${res.data['data']['appealId']}');
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('제출')),
      ],
    ));
  }

  void _showAiConsentRevokeDialog() {
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('AI 동의 철회'),
      content: const Text('AI 분석 동의를 철회하면 성격 분석, 매칭 추천 등 AI 기능을 이용할 수 없게 됩니다.\n\n정말 철회하시겠어요?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          try {
            await app.dio.delete('${app.baseUrl}/api/consent', options: app.authHeaders);
            _snack('AI 동의 철회 완료');
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('철회', style: TextStyle(color: Colors.red))),
      ],
    ));
  }

  void _showAiSimulateDialog() {
    final diaryIdCtrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('AI 분석 시뮬레이션'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: diaryIdCtrl, decoration: const InputDecoration(labelText: 'diaryId'), keyboardType: TextInputType.number),
        const SizedBox(height: 8),
        const Text('AI 서버 없이 가짜 분석 결과를 생성합니다.\n2~3초 후 일기 상세에서 AI 태그를 확인하세요.', style: TextStyle(fontSize: 12, color: Colors.grey)),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          final diaryId = diaryIdCtrl.text.trim();
          if (diaryId.isEmpty) return;
          try {
            final res = await app.dio.post('${app.baseUrl}/api/dev/ai/simulate/$diaryId');
            _showJson('AI 시뮬레이션', res.data);
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('실행', style: TextStyle(color: Colors.amber))),
      ],
    ));
  }

  void _showInquiryDialog() {
    final titleCtrl = TextEditingController();
    final contentCtrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('1:1 문의'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: '제목 (5자 이상)')),
        const SizedBox(height: 8),
        TextField(controller: contentCtrl, decoration: const InputDecoration(labelText: '내용 (10자 이상)'), maxLines: 3),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          try {
            final res = await app.dio.post('${app.baseUrl}/api/support/inquiry',
              data: {'category': 'ACCOUNT', 'title': titleCtrl.text, 'content': contentCtrl.text},
              options: app.authHeaders);
            _snack('문의 접수 완료: ID=${res.data['data']['inquiryId']}');
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('제출')),
      ],
    ));
  }

  void _showRedisGetDialog() {
    final keyCtrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('Redis 키 조회'),
      content: TextField(controller: keyCtrl, decoration: const InputDecoration(labelText: 'key (예: AI:DIARY:123)')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          final key = keyCtrl.text.trim();
          if (key.isEmpty) return;
          try {
            final res = await app.dio.get('${app.baseUrl}/api/dev/redis/get',
              queryParameters: {'key': key});
            _showJson('Redis [$key]', res.data);
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('조회', style: TextStyle(color: Colors.amber))),
      ],
    ));
  }

  void _showRedisDeleteDialog() {
    final keyCtrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('Redis 키 삭제'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: keyCtrl, decoration: const InputDecoration(labelText: 'key')),
        const SizedBox(height: 8),
        const Text('삭제 후 복구 불가', style: TextStyle(fontSize: 12, color: Colors.redAccent)),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          final key = keyCtrl.text.trim();
          if (key.isEmpty) return;
          try {
            final res = await app.dio.delete('${app.baseUrl}/api/dev/redis/delete',
              queryParameters: {'key': key});
            _showJson('삭제 결과', res.data);
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('삭제', style: TextStyle(color: Colors.redAccent))),
      ],
    ));
  }

  void _showRedisPatternDialog() {
    final patternCtrl = TextEditingController(text: '*');
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('Redis 패턴 검색'),
      content: TextField(controller: patternCtrl, decoration: const InputDecoration(labelText: 'pattern (예: AI:DIARY:*)')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          final pattern = patternCtrl.text.trim();
          if (pattern.isEmpty) return;
          try {
            final res = await app.dio.get('${app.baseUrl}/api/dev/redis/keys',
              queryParameters: {'pattern': pattern});
            _showJson('패턴 [$pattern] 결과', res.data);
          } catch (e) { _snack(app.errMsg(e)); }
        }, child: const Text('검색', style: TextStyle(color: Colors.amber))),
      ],
    ));
  }
}

// ══════════════════════════════════════
// 프로필 상세 화면
// ══════════════════════════════════════
class MyProfileScreen extends StatefulWidget {
  final Map<String, dynamic> profile;
  const MyProfileScreen({super.key, required this.profile});

  @override
  State<MyProfileScreen> createState() => _MyProfileScreenState();
}

class _MyProfileScreenState extends State<MyProfileScreen> {
  final app = AppState();
  late Map<String, dynamic> profile;

  @override
  void initState() {
    super.initState();
    profile = widget.profile;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('내 프로필')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // 프로필 카드
          Card(
            elevation: 3,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: Colors.orange.withOpacity(0.2),
                  child: Text(
                    (profile['nickname'] ?? '?').toString().substring(0, 1),
                    style: const TextStyle(fontSize: 32, color: Colors.orange),
                  ),
                ),
                const SizedBox(height: 12),
                Text(profile['nickname'] ?? '???',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                if (profile['onboardingCompleted'] == true)
                  const Chip(label: Text('온보딩 완료', style: TextStyle(fontSize: 11, color: Colors.greenAccent))),
              ]),
            ),
          ),
          const SizedBox(height: 16),
          // 상세 정보
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Column(children: [
              _profileRow(Icons.person, '성별', _genderLabel(profile['gender'])),
              const Divider(height: 1),
              _profileRow(Icons.cake, '생년월일', profile['birthDate'] ?? '-'),
              const Divider(height: 1),
              _profileRow(Icons.location_on, '지역', profile['sido'] ?? '-'),
              const Divider(height: 1),
              _profileRow(Icons.school, '학교', profile['school'] ?? '-'),
              const Divider(height: 1),
              _profileRow(Icons.badge, 'userId', '${profile['userId'] ?? app.userId ?? '-'}'),
            ]),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _showEditDialog,
              icon: const Icon(Icons.edit),
              label: const Text('프로필 수정'),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _profileRow(IconData icon, String label, String value) {
    return ListTile(
      leading: Icon(icon, size: 20, color: Colors.white54),
      title: Text(label, style: const TextStyle(fontSize: 13, color: Colors.white54)),
      trailing: Text(value, style: const TextStyle(fontSize: 14)),
    );
  }

  String _genderLabel(String? g) {
    if (g == 'MALE') return '남성';
    if (g == 'FEMALE') return '여성';
    return g ?? '-';
  }

  void _showEditDialog() {
    final nicknameCtrl = TextEditingController(text: profile['nickname']);
    final sidoCtrl = TextEditingController(text: profile['sido']);
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('프로필 수정'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: nicknameCtrl, decoration: const InputDecoration(labelText: '닉네임')),
        const SizedBox(height: 8),
        TextField(controller: sidoCtrl, decoration: const InputDecoration(labelText: '시/도')),
        const SizedBox(height: 8),
        const Text('닉네임은 30일에 1회만 변경 가능', style: TextStyle(fontSize: 11, color: Colors.grey)),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
        TextButton(onPressed: () async {
          Navigator.pop(context);
          try {
            final data = <String, dynamic>{};
            if (nicknameCtrl.text != profile['nickname']) data['nickname'] = nicknameCtrl.text;
            if (sidoCtrl.text != profile['sido']) data['sido'] = sidoCtrl.text;
            if (data.isEmpty) return;
            final res = await app.dio.patch('${app.baseUrl}/api/users/me/profile',
              data: data, options: app.authHeaders);
            setState(() => profile = res.data['data']);
            if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('프로필 수정 완료')));
          } catch (e) {
            if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
          }
        }, child: const Text('저장')),
      ],
    ));
  }
}

// ══════════════════════════════════════
// AI 프로필 화면
// ══════════════════════════════════════
class AiProfileScreen extends StatelessWidget {
  final Map<String, dynamic> data;
  const AiProfileScreen({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final diaryCount = data['analyzedDiaryCount'] ?? data['diaryCount'] ?? 0;
    final available = data['available'] != false;

    return Scaffold(
      appBar: AppBar(title: const Text('AI 성격 분석')),
      body: !available
        ? Center(child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.psychology, size: 64, color: Colors.white24),
              const SizedBox(height: 12),
              Text(data['message'] ?? '일기를 3편 이상 작성하면 분석이 시작됩니다',
                style: const TextStyle(color: Colors.white54), textAlign: TextAlign.center),
            ],
          ))
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // 분석된 일기 수
              Card(
                color: Colors.orange.withOpacity(0.1),
                child: ListTile(
                  leading: const Icon(Icons.auto_stories, color: Colors.orange),
                  title: Text('분석된 일기: $diaryCount편'),
                ),
              ),
              const SizedBox(height: 16),

              // 성격 키워드
              if (data['personalityKeywords'] != null)
                _tagSection('성격 키워드', data['personalityKeywords'], Colors.purple),
              if (data['emotionKeywords'] != null || data['emotionTags'] != null)
                _tagSection('감정 태그', data['emotionKeywords'] ?? data['emotionTags'], Colors.pink),
              if (data['lifestyleKeywords'] != null || data['lifestyleTags'] != null)
                _tagSection('라이프스타일 태그', data['lifestyleKeywords'] ?? data['lifestyleTags'], Colors.teal),
              if (data['relationshipKeywords'] != null || data['relationshipTags'] != null)
                _tagSection('관계 성향', data['relationshipKeywords'] ?? data['relationshipTags'], Colors.blue),
              if (data['toneKeywords'] != null || data['toneTags'] != null)
                _tagSection('글쓰기 톤', data['toneKeywords'] ?? data['toneTags'], Colors.amber),

              // AI 한줄 설명
              if (data['aiDescription'] != null || data['summary'] != null) ...[
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.orange.withOpacity(0.3)),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('AI 분석 요약', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange, fontSize: 13)),
                    const SizedBox(height: 6),
                    Text(data['aiDescription'] ?? data['summary'] ?? '',
                      style: const TextStyle(height: 1.5)),
                  ]),
                ),
              ],
            ]),
          ),
    );
  }

  Widget _tagSection(String title, dynamic tags, Color color) {
    if (tags == null) return const SizedBox.shrink();
    final tagList = tags is List ? tags : [];
    if (tagList.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white54, fontSize: 14)),
        const SizedBox(height: 8),
        Wrap(spacing: 6, runSpacing: 6, children: tagList.map((t) {
          final label = t is String ? t : (t is Map ? (t['label'] ?? t['keyword'] ?? '') : '$t');
          final count = t is Map ? t['count'] : null;
          return Chip(
            label: Text(
              count != null ? '$label ($count)' : '$label',
              style: TextStyle(fontSize: 12, color: color),
            ),
            backgroundColor: color.withOpacity(0.15),
            side: BorderSide(color: color.withOpacity(0.3)),
          );
        }).toList()),
      ]),
    );
  }
}

// ══════════════════════════════════════
// 이상형 키워드 조회/수정 화면
// ══════════════════════════════════════
class IdealTypeViewScreen extends StatefulWidget {
  final dynamic data;
  const IdealTypeViewScreen({super.key, required this.data});

  @override
  State<IdealTypeViewScreen> createState() => _IdealTypeViewScreenState();
}

class _IdealTypeViewScreenState extends State<IdealTypeViewScreen> {
  final app = AppState();
  late dynamic data;

  @override
  void initState() {
    super.initState();
    data = widget.data;
  }

  List<dynamic> get keywords {
    if (data is Map && data['keywords'] != null) return data['keywords'];
    if (data is List) return data;
    return [];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('이상형 키워드')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('현재 이상형 키워드', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('${keywords.length}/3 선택됨', style: const TextStyle(color: Colors.white54)),
            const SizedBox(height: 16),
            keywords.isEmpty
              ? const Center(child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Text('설정된 키워드가 없습니다', style: TextStyle(color: Colors.white38)),
                ))
              : Wrap(
                  spacing: 10, runSpacing: 10,
                  children: keywords.map((k) {
                    final label = k is String ? k : (k is Map ? (k['label'] ?? k['keyword'] ?? '') : '$k');
                    return Chip(
                      label: Text(label, style: const TextStyle(fontSize: 14)),
                      backgroundColor: Colors.pink.withOpacity(0.15),
                      side: BorderSide(color: Colors.pink.withOpacity(0.3)),
                      avatar: const Icon(Icons.favorite, size: 16, color: Colors.pink),
                    );
                  }).toList(),
                ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _showEditScreen,
                icon: const Icon(Icons.edit),
                label: const Text('키워드 수정'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showEditScreen() async {
    try {
      final keywordRes = await app.dio.get('${app.baseUrl}/api/users/ideal-type/keyword-list');
      final allKeywords = keywordRes.data['data']['keywords'] as List;
      // 현재 선택된 ID 추출
      final selectedIds = <int>{};
      for (final k in keywords) {
        if (k is Map && k['id'] != null) selectedIds.add(k['id']);
      }

      if (mounted) {
        final result = await Navigator.push<Set<int>>(context, MaterialPageRoute(
          builder: (_) => IdealTypeEditScreen(allKeywords: allKeywords, selectedIds: selectedIds)));
        if (result != null) {
          try {
            final res = await app.dio.put('${app.baseUrl}/api/users/me/ideal-type',
              data: {'keywordIds': result.toList()}, options: app.authHeaders);
            setState(() => data = res.data['data']);
            if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('이상형 키워드 수정 완료!')));
          } catch (e) {
            if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
          }
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }
}

class IdealTypeEditScreen extends StatefulWidget {
  final List<dynamic> allKeywords;
  final Set<int> selectedIds;
  const IdealTypeEditScreen({super.key, required this.allKeywords, required this.selectedIds});

  @override
  State<IdealTypeEditScreen> createState() => _IdealTypeEditScreenState();
}

class _IdealTypeEditScreenState extends State<IdealTypeEditScreen> {
  late Set<int> selected;

  @override
  void initState() {
    super.initState();
    selected = Set.from(widget.selectedIds);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('이상형 키워드 수정'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, selected),
            child: const Text('저장', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${selected.length}/3 선택됨', style: const TextStyle(color: Colors.white54)),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8, runSpacing: 8,
            children: widget.allKeywords.map((k) {
              final id = k['id'] as int;
              final isSelected = selected.contains(id);
              return FilterChip(
                label: Text(k['label']),
                selected: isSelected,
                onSelected: (v) {
                  setState(() {
                    if (v && selected.length < 3) selected.add(id);
                    else selected.remove(id);
                  });
                },
              );
            }).toList(),
          ),
        ]),
      ),
    );
  }
}

// ══════════════════════════════════════
// 알림 목록 화면
// ══════════════════════════════════════
class NotificationListScreen extends StatefulWidget {
  final Map<String, dynamic> data;
  const NotificationListScreen({super.key, required this.data});

  @override
  State<NotificationListScreen> createState() => _NotificationListScreenState();
}

class _NotificationListScreenState extends State<NotificationListScreen> {
  final app = AppState();
  late Map<String, dynamic> data;

  @override
  void initState() {
    super.initState();
    data = widget.data;
  }

  List<dynamic> get notifications => data['notifications'] ?? [];
  int get unreadCount => data['unreadCount'] ?? 0;

  IconData _iconForType(String? type) {
    switch (type) {
      case 'MATCHING_REQUEST': return Icons.favorite;
      case 'MATCHING_MATCHED': return Icons.celebration;
      case 'EXCHANGE_DIARY': return Icons.swap_horiz;
      case 'EXCHANGE_REMIND': return Icons.alarm;
      case 'EXCHANGE_EXPIRED': return Icons.timer_off;
      case 'CHAT_MESSAGE': return Icons.chat;
      case 'COUPLE_REQUEST': return Icons.favorite_border;
      case 'COUPLE_ACCEPTED': return Icons.favorite;
      case 'AI_ANALYSIS_DONE': return Icons.psychology;
      case 'AI_REPORT_DONE': return Icons.analytics;
      case 'SYSTEM': return Icons.info;
      default: return Icons.notifications;
    }
  }

  Color _colorForType(String? type) {
    switch (type) {
      case 'MATCHING_REQUEST':
      case 'MATCHING_MATCHED': return Colors.pink;
      case 'EXCHANGE_DIARY':
      case 'EXCHANGE_REMIND': return Colors.orange;
      case 'CHAT_MESSAGE': return Colors.blue;
      case 'COUPLE_REQUEST':
      case 'COUPLE_ACCEPTED': return Colors.red;
      case 'AI_ANALYSIS_DONE':
      case 'AI_REPORT_DONE': return Colors.purple;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('알림 ($unreadCount 미읽음)'),
        actions: [
          TextButton.icon(
            onPressed: _readAll,
            icon: const Icon(Icons.done_all, size: 18),
            label: const Text('전체 읽음'),
          ),
        ],
      ),
      body: notifications.isEmpty
        ? const Center(child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.notifications_none, size: 64, color: Colors.white24),
              SizedBox(height: 12),
              Text('알림이 없습니다', style: TextStyle(color: Colors.white54)),
            ],
          ))
        : RefreshIndicator(
            onRefresh: _reload,
            child: ListView.separated(
              itemCount: notifications.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final n = notifications[i];
                final isRead = n['readAt'] != null || n['isRead'] == true;
                final type = n['type'] as String?;
                final createdAt = n['createdAt'] as String? ?? '';
                final timeStr = createdAt.length >= 16 ? createdAt.substring(5, 16).replaceAll('T', ' ') : '';

                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _colorForType(type).withOpacity(isRead ? 0.1 : 0.3),
                    child: Icon(_iconForType(type), color: _colorForType(type), size: 20),
                  ),
                  title: Text(n['title'] ?? type ?? '알림',
                    style: TextStyle(fontWeight: isRead ? FontWeight.normal : FontWeight.bold, fontSize: 14)),
                  subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    if (n['message'] != null || n['body'] != null)
                      Text(n['message'] ?? n['body'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13)),
                    Text(timeStr, style: const TextStyle(fontSize: 11, color: Colors.white38)),
                  ]),
                  trailing: isRead
                    ? null
                    : Container(
                        width: 8, height: 8,
                        decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.orange),
                      ),
                  onTap: () => _markAsRead(n),
                );
              },
            ),
          ),
    );
  }

  Future<void> _reload() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/notifications', options: app.authHeaders);
      setState(() => data = res.data['data']);
    } catch (_) {}
  }

  void _markAsRead(Map<String, dynamic> n) async {
    if (n['readAt'] != null || n['isRead'] == true) return;
    final id = n['notificationId'] ?? n['id'];
    if (id == null) return;
    try {
      await app.dio.patch('${app.baseUrl}/api/notifications/$id/read', options: app.authHeaders);
      _reload();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  void _readAll() async {
    try {
      final res = await app.dio.patch('${app.baseUrl}/api/notifications/read-all', options: app.authHeaders);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${res.data['data']['updatedCount']}건 읽음 처리')));
      _reload();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }
}

// ══════════════════════════════════════
// 알림 설정 화면
// ══════════════════════════════════════
class NotificationSettingsScreen extends StatefulWidget {
  final dynamic settings;
  const NotificationSettingsScreen({super.key, required this.settings});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  final app = AppState();
  late Map<String, bool> toggles;

  static const _categories = [
    {'key': 'matching', 'label': '매칭 알림', 'icon': Icons.favorite},
    {'key': 'exchange', 'label': '교환일기 알림', 'icon': Icons.swap_horiz},
    {'key': 'chat', 'label': '채팅 알림', 'icon': Icons.chat},
    {'key': 'diary', 'label': '일기 알림', 'icon': Icons.auto_stories},
    {'key': 'couple', 'label': '커플 알림', 'icon': Icons.people},
    {'key': 'system', 'label': '시스템 알림', 'icon': Icons.info},
  ];

  @override
  void initState() {
    super.initState();
    toggles = {};
    for (final c in _categories) {
      final key = c['key'] as String;
      if (widget.settings is Map) {
        toggles[key] = widget.settings[key] ?? true;
      } else {
        toggles[key] = true;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('알림 설정')),
      body: ListView(
        children: _categories.map((c) {
          final key = c['key'] as String;
          return SwitchListTile(
            secondary: Icon(c['icon'] as IconData, color: Colors.white54),
            title: Text(c['label'] as String),
            value: toggles[key] ?? true,
            onChanged: (v) async {
              setState(() => toggles[key] = v);
              try {
                await app.dio.patch('${app.baseUrl}/api/users/me/notification-settings',
                  data: {key: v}, options: app.authHeaders);
              } catch (e) {
                setState(() => toggles[key] = !v);
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
              }
            },
          );
        }).toList(),
      ),
    );
  }
}

// ══════════════════════════════════════
// 차단 목록 화면
// ══════════════════════════════════════
class BlockListScreen extends StatefulWidget {
  final dynamic data;
  const BlockListScreen({super.key, required this.data});

  @override
  State<BlockListScreen> createState() => _BlockListScreenState();
}

class _BlockListScreenState extends State<BlockListScreen> {
  final app = AppState();
  late List<dynamic> blocks;

  @override
  void initState() {
    super.initState();
    if (widget.data is Map && widget.data['blocks'] != null) {
      blocks = List.from(widget.data['blocks']);
    } else if (widget.data is List) {
      blocks = List.from(widget.data);
    } else {
      blocks = [];
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('차단 목록 (${blocks.length})')),
      body: blocks.isEmpty
        ? const Center(child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.block, size: 64, color: Colors.white24),
              SizedBox(height: 12),
              Text('차단한 사용자가 없습니다', style: TextStyle(color: Colors.white54)),
            ],
          ))
        : ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: blocks.length,
            itemBuilder: (_, i) {
              final b = blocks[i];
              final nickname = b['nickname'] ?? b['targetNickname'] ?? '사용자 ${b['targetUserId'] ?? ''}';
              final blockedAt = b['blockedAt'] ?? b['createdAt'] ?? '';
              final dateStr = blockedAt.toString().length >= 10 ? blockedAt.toString().substring(0, 10) : '';

              return Card(
                child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.person_off)),
                  title: Text(nickname),
                  subtitle: Text('차단일: $dateStr'),
                  trailing: TextButton(
                    onPressed: () => _unblock(b, i),
                    child: const Text('해제', style: TextStyle(color: Colors.redAccent)),
                  ),
                ),
              );
            },
          ),
    );
  }

  void _unblock(Map<String, dynamic> b, int index) async {
    final targetId = b['targetUserId'] ?? b['userId'];
    if (targetId == null) return;
    try {
      await app.dio.delete('${app.baseUrl}/api/users/$targetId/block', options: app.authHeaders);
      setState(() => blocks.removeAt(index));
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('차단 해제 완료')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }
}

// ══════════════════════════════════════
// 교환일기 히스토리 화면
// ══════════════════════════════════════
class ExchangeHistoryScreen extends StatelessWidget {
  final dynamic data;
  const ExchangeHistoryScreen({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final rooms = (data is Map && data['rooms'] != null) ? data['rooms'] as List
      : (data is List ? data : []);

    return Scaffold(
      appBar: AppBar(title: Text('교환일기 히스토리 (${rooms.length})')),
      body: rooms.isEmpty
        ? const Center(child: Text('교환일기 기록이 없습니다', style: TextStyle(color: Colors.white54)))
        : ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: rooms.length,
            itemBuilder: (_, i) {
              final r = rooms[i];
              final status = r['status'] ?? '';
              Color statusColor = Colors.grey;
              if (status == 'COMPLETED') statusColor = Colors.green;
              if (status == 'EXPIRED') statusColor = Colors.red;
              if (status == 'CHAT_CONNECTED') statusColor = Colors.purple;
              if (status == 'ACTIVE') statusColor = Colors.orange;

              return Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      const Icon(Icons.menu_book, size: 18),
                      const SizedBox(width: 8),
                      Text(r['partnerNickname'] ?? '???',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(status,
                          style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ]),
                    const SizedBox(height: 8),
                    Row(children: [
                      Text('라운드 ${r['roundNumber'] ?? r['roundCount'] ?? '-'}',
                        style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                      const SizedBox(width: 12),
                      Text('${r['currentTurn'] ?? r['turnCount'] ?? 0}/4 턴',
                        style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                      const Spacer(),
                      if (r['createdAt'] != null)
                        Text(r['createdAt'].toString().substring(0, 10),
                          style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                    ]),
                  ]),
                ),
              );
            },
          ),
    );
  }
}

// ══════════════════════════════════════
// 채팅 히스토리 화면
// ══════════════════════════════════════
class ChatHistoryScreen extends StatelessWidget {
  final dynamic data;
  const ChatHistoryScreen({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final rooms = (data is Map && data['chatRooms'] != null) ? data['chatRooms'] as List
      : (data is Map && data['rooms'] != null) ? data['rooms'] as List
      : (data is List ? data : []);

    return Scaffold(
      appBar: AppBar(title: Text('채팅 히스토리 (${rooms.length})')),
      body: rooms.isEmpty
        ? const Center(child: Text('채팅 기록이 없습니다', style: TextStyle(color: Colors.white54)))
        : ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: rooms.length,
            itemBuilder: (_, i) {
              final r = rooms[i];
              final status = r['status'] ?? '';
              Color statusColor = Colors.grey;
              if (status == 'ACTIVE') statusColor = Colors.blue;
              if (status == 'COUPLE_CONFIRMED') statusColor = Colors.pink;
              if (status == 'CHAT_LEFT') statusColor = Colors.grey;

              return Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: statusColor.withOpacity(0.2),
                    child: Icon(
                      status == 'COUPLE_CONFIRMED' ? Icons.favorite : Icons.chat,
                      color: statusColor, size: 20),
                  ),
                  title: Text(r['partnerNickname'] ?? '???', style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    if (r['lastMessage'] != null)
                      Text(r['lastMessage'], maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13, color: Colors.white54)),
                    Text(status, style: TextStyle(fontSize: 11, color: statusColor)),
                  ]),
                  trailing: r['lastMessageAt'] != null
                    ? Text(r['lastMessageAt'].toString().substring(0, 10),
                        style: const TextStyle(fontSize: 11, color: Colors.white38))
                    : null,
                ),
              );
            },
          ),
    );
  }
}

// ══════════════════════════════════════
// 공지사항 목록 화면
// ══════════════════════════════════════
class NoticeListScreen extends StatefulWidget {
  final dynamic data;
  const NoticeListScreen({super.key, required this.data});

  @override
  State<NoticeListScreen> createState() => _NoticeListScreenState();
}

class _NoticeListScreenState extends State<NoticeListScreen> {
  final app = AppState();
  List<dynamic> banners = [];
  int unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _loadExtras();
  }

  Future<void> _loadExtras() async {
    try {
      final results = await Future.wait([
        app.dio.get('${app.baseUrl}/api/notices/banners', options: app.authHeaders).catchError((_) => Response(requestOptions: RequestOptions(), data: {'data': {'banners': []}})),
        app.dio.get('${app.baseUrl}/api/notices/unread-count', options: app.authHeaders).catchError((_) => Response(requestOptions: RequestOptions(), data: {'data': {'count': 0}})),
      ]);
      setState(() {
        banners = results[0].data['data']['banners'] ?? results[0].data['data'] ?? [];
        unreadCount = results[1].data['data']['count'] ?? results[1].data['data']['unreadCount'] ?? 0;
      });
    } catch (_) {}
  }

  List<dynamic> get notices {
    if (widget.data is Map && widget.data['notices'] != null) return widget.data['notices'];
    if (widget.data is List) return widget.data;
    return [];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          const Text('공지사항'),
          if (unreadCount > 0) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: Colors.orange, borderRadius: BorderRadius.circular(10)),
              child: Text('$unreadCount', style: const TextStyle(fontSize: 11, color: Colors.white)),
            ),
          ],
        ]),
      ),
      body: Column(children: [
        // 배너 영역
        if (banners.isNotEmpty)
          SizedBox(
            height: 80,
            child: PageView.builder(
              itemCount: banners.length,
              itemBuilder: (_, i) {
                final b = banners[i];
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.orange.withOpacity(0.3), Colors.deepOrange.withOpacity(0.2)],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  padding: const EdgeInsets.all(12),
                  child: Center(child: Text(
                    b['title'] ?? b['content'] ?? '',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  )),
                );
              },
            ),
          ),
        // 공지 목록
        Expanded(
          child: notices.isEmpty
            ? const Center(child: Text('공지사항이 없습니다', style: TextStyle(color: Colors.white54)))
            : ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: notices.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final n = notices[i];
                  final isPinned = n['pinned'] == true || n['isPinned'] == true;
                  return ListTile(
                    leading: isPinned
                      ? const Icon(Icons.push_pin, color: Colors.orange, size: 20)
                      : const Icon(Icons.article_outlined, size: 20),
                    title: Text(n['title'] ?? '', style: TextStyle(
                      fontWeight: isPinned ? FontWeight.bold : FontWeight.normal)),
                    subtitle: Text(n['createdAt']?.toString().substring(0, 10) ?? ''),
                    trailing: const Icon(Icons.chevron_right, size: 18),
                    onTap: () => _showDetail(n),
                  );
                },
              ),
        ),
      ]),
    );
  }

  void _showDetail(Map<String, dynamic> notice) async {
    final id = notice['noticeId'] ?? notice['id'];
    if (id == null) return;
    try {
      final res = await app.dio.get('${app.baseUrl}/api/notices/$id', options: app.authHeaders);
      if (mounted) {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => NoticeDetailScreen(notice: res.data['data'])));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }
}

class NoticeDetailScreen extends StatelessWidget {
  final Map<String, dynamic> notice;
  const NoticeDetailScreen({super.key, required this.notice});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('공지사항')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (notice['pinned'] == true || notice['isPinned'] == true)
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.2),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text('고정 공지', style: TextStyle(fontSize: 11, color: Colors.orange)),
            ),
          Text(notice['title'] ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(notice['createdAt']?.toString().substring(0, 10) ?? '',
            style: const TextStyle(color: Colors.white38, fontSize: 13)),
          const Divider(height: 24),
          Text(notice['content'] ?? '', style: const TextStyle(fontSize: 15, height: 1.7)),
        ]),
      ),
    );
  }
}

// ══════════════════════════════════════
// FAQ 화면
// ══════════════════════════════════════
class FaqScreen extends StatelessWidget {
  final dynamic data;
  const FaqScreen({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final faqs = (data is Map && data['faqs'] != null) ? data['faqs'] as List
      : (data is List ? data : []);

    return Scaffold(
      appBar: AppBar(title: const Text('자주 묻는 질문')),
      body: faqs.isEmpty
        ? const Center(child: Text('FAQ가 없습니다', style: TextStyle(color: Colors.white54)))
        : ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: faqs.length,
            itemBuilder: (_, i) {
              final f = faqs[i];
              return Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                child: ExpansionTile(
                  leading: const Icon(Icons.help_outline, size: 20),
                  title: Text(f['question'] ?? f['title'] ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                  subtitle: f['category'] != null
                    ? Text(f['category'], style: const TextStyle(fontSize: 11, color: Colors.white38))
                    : null,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      child: Text(f['answer'] ?? f['content'] ?? '', style: const TextStyle(height: 1.6, color: Colors.white70)),
                    ),
                  ],
                ),
              );
            },
          ),
    );
  }
}

// ══════════════════════════════════════
// 내 문의 목록 화면
// ══════════════════════════════════════
class InquiryListScreen extends StatelessWidget {
  final dynamic data;
  const InquiryListScreen({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final app = AppState();
    final inquiries = (data is Map && data['inquiries'] != null) ? data['inquiries'] as List
      : (data is List ? data : []);

    return Scaffold(
      appBar: AppBar(title: Text('내 문의 (${inquiries.length})')),
      body: inquiries.isEmpty
        ? const Center(child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.support_agent, size: 64, color: Colors.white24),
              SizedBox(height: 12),
              Text('문의 내역이 없습니다', style: TextStyle(color: Colors.white54)),
            ],
          ))
        : ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: inquiries.length,
            itemBuilder: (_, i) {
              final inq = inquiries[i];
              final status = inq['status'] ?? '';
              final isAnswered = status == 'ANSWERED' || status == 'COMPLETED';

              return Card(
                child: ListTile(
                  leading: Icon(
                    isAnswered ? Icons.check_circle : Icons.hourglass_top,
                    color: isAnswered ? Colors.greenAccent : Colors.amber,
                  ),
                  title: Text(inq['title'] ?? '', style: const TextStyle(fontSize: 14)),
                  subtitle: Row(children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: isAnswered ? Colors.green.withOpacity(0.15) : Colors.amber.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(isAnswered ? '답변완료' : '대기중',
                        style: TextStyle(fontSize: 10, color: isAnswered ? Colors.greenAccent : Colors.amber)),
                    ),
                    const SizedBox(width: 8),
                    Text(inq['createdAt']?.toString().substring(0, 10) ?? '',
                      style: const TextStyle(fontSize: 11)),
                  ]),
                  trailing: const Icon(Icons.chevron_right, size: 18),
                  onTap: () async {
                    final id = inq['inquiryId'] ?? inq['id'];
                    if (id == null) return;
                    try {
                      final res = await app.dio.get('${app.baseUrl}/api/support/inquiries/$id',
                        options: app.authHeaders);
                      if (context.mounted) {
                        Navigator.push(context, MaterialPageRoute(
                          builder: (_) => InquiryDetailScreen(inquiry: res.data['data'])));
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
                      }
                    }
                  },
                ),
              );
            },
          ),
    );
  }
}

class InquiryDetailScreen extends StatelessWidget {
  final Map<String, dynamic> inquiry;
  const InquiryDetailScreen({super.key, required this.inquiry});

  @override
  Widget build(BuildContext context) {
    final status = inquiry['status'] ?? '';
    final isAnswered = status == 'ANSWERED' || status == 'COMPLETED';

    return Scaffold(
      appBar: AppBar(title: const Text('문의 상세')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // 상태 배지
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isAnswered ? Colors.green.withOpacity(0.15) : Colors.amber.withOpacity(0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(isAnswered ? '답변 완료' : '답변 대기중',
              style: TextStyle(color: isAnswered ? Colors.greenAccent : Colors.amber, fontSize: 12)),
          ),
          const SizedBox(height: 12),
          Text(inquiry['title'] ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(inquiry['createdAt']?.toString().substring(0, 10) ?? '',
            style: const TextStyle(color: Colors.white38, fontSize: 13)),
          if (inquiry['category'] != null) ...[
            const SizedBox(height: 4),
            Text('카테고리: ${inquiry['category']}', style: const TextStyle(color: Colors.white38, fontSize: 13)),
          ],
          const Divider(height: 24),
          const Text('문의 내용', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white54)),
          const SizedBox(height: 8),
          Text(inquiry['content'] ?? '', style: const TextStyle(fontSize: 15, height: 1.6)),
          if (inquiry['answer'] != null || inquiry['reply'] != null) ...[
            const SizedBox(height: 24),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.green.withOpacity(0.2)),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('관리자 답변', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.greenAccent, fontSize: 13)),
                const SizedBox(height: 8),
                Text(inquiry['answer'] ?? inquiry['reply'] ?? '', style: const TextStyle(height: 1.6)),
              ]),
            ),
          ],
        ]),
      ),
    );
  }
}

// ══════════════════════════════════════
// 앱 설정 화면
// ══════════════════════════════════════
class AppSettingsScreen extends StatefulWidget {
  const AppSettingsScreen({super.key});

  @override
  State<AppSettingsScreen> createState() => _AppSettingsScreenState();
}

class _AppSettingsScreenState extends State<AppSettingsScreen> {
  final app = AppState();
  bool darkMode = true;
  String language = 'ko';
  bool ageFilter = false;

  Future<void> _updateSetting(Map<String, dynamic> data) async {
    try {
      await app.dio.patch('${app.baseUrl}/api/users/me/settings',
        data: data, options: app.authHeaders);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('설정 저장됨')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('앱 설정')),
      body: ListView(children: [
        SwitchListTile(
          secondary: const Icon(Icons.dark_mode),
          title: const Text('다크 모드'),
          value: darkMode,
          onChanged: (v) {
            setState(() => darkMode = v);
            _updateSetting({'darkMode': v});
          },
        ),
        const Divider(height: 1),
        ListTile(
          leading: const Icon(Icons.language),
          title: const Text('언어'),
          trailing: SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'ko', label: Text('한국어')),
              ButtonSegment(value: 'en', label: Text('English')),
            ],
            selected: {language},
            onSelectionChanged: (s) {
              setState(() => language = s.first);
              _updateSetting({'language': s.first});
            },
            style: const ButtonStyle(tapTargetSize: MaterialTapTargetSize.shrinkWrap),
          ),
        ),
        const Divider(height: 1),
        SwitchListTile(
          secondary: const Icon(Icons.filter_alt),
          title: const Text('연령 필터'),
          subtitle: const Text('같은 연령대만 매칭'),
          value: ageFilter,
          onChanged: (v) {
            setState(() => ageFilter = v);
            _updateSetting({'ageFilter': v});
          },
        ),
      ]),
    );
  }
}

// ── 교환일기 바디 래퍼 ──
class _ExchangeBody extends StatelessWidget {
  const _ExchangeBody();
  @override
  Widget build(BuildContext context) => const ExchangeTab(standaloneAppBar: false);
}

// ── 채팅 바디 래퍼 ──
class _ChatBody extends StatelessWidget {
  const _ChatBody();
  @override
  Widget build(BuildContext context) => const ChatTab(standaloneAppBar: false);
}

// ══════════════════════════════════════
// 6. 교환일기 탭
// ══════════════════════════════════════
class ExchangeTab extends StatefulWidget {
  final bool standaloneAppBar;
  const ExchangeTab({super.key, this.standaloneAppBar = true});

  @override
  State<ExchangeTab> createState() => _ExchangeTabState();
}

class _ExchangeTabState extends State<ExchangeTab> {
  final app = AppState();
  List<dynamic> rooms = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final res = await app.dio.get('${app.baseUrl}/api/exchange-rooms', options: app.authHeaders);
      setState(() {
        rooms = res.data['data']['rooms'] ?? [];
        loading = false;
      });
    } catch (e) {
      setState(() => loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.standaloneAppBar ? AppBar(title: const Text('교환일기')) : null,
      body: loading
        ? const Center(child: CircularProgressIndicator())
        : rooms.isEmpty
          ? Center(child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.swap_horiz, size: 64, color: Colors.white24),
                SizedBox(height: 12),
                Text('진행 중인 교환일기가 없어요', style: TextStyle(color: Colors.white54)),
                SizedBox(height: 8),
                Text('탐색 탭에서 매칭을 시작해보세요!', style: TextStyle(color: Colors.white38, fontSize: 13)),
              ],
            ))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.builder(
                itemCount: rooms.length,
                itemBuilder: (_, i) => _buildRoomCard(rooms[i]),
              ),
            ),
    );
  }

  Widget _buildRoomCard(Map<String, dynamic> room) {
    final status = room['status'] as String;
    final isMyTurn = room['isMyTurn'] == true;
    final turn = room['currentTurn'] ?? 0;
    final partner = room['partnerNickname'] ?? '???';

    Color statusColor = Colors.grey;
    String statusText = status;
    if (status == 'ACTIVE') {
      statusColor = isMyTurn ? Colors.orangeAccent : Colors.blueAccent;
      statusText = isMyTurn ? '내 차례' : '상대 차례';
    } else if (status == 'COMPLETED') {
      statusColor = Colors.greenAccent;
      statusText = '완주! 관계 확장 선택';
    } else if (status == 'EXPIRED') {
      statusColor = Colors.redAccent;
      statusText = '만료됨';
    } else if (status == 'CHAT_CONNECTED') {
      statusColor = Colors.purpleAccent;
      statusText = '채팅 연결됨';
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => Navigator.push(context,
          MaterialPageRoute(builder: (_) => ExchangeRoomScreen(roomId: room['roomId']))),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(Icons.menu_book, size: 18, color: statusColor),
              const SizedBox(width: 8),
              Text(partner, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(statusText,
                  style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ]),
            const SizedBox(height: 10),
            Row(children: List.generate(4, (i) {
              final done = i < turn;
              return Expanded(child: Container(
                margin: EdgeInsets.only(right: i < 3 ? 3 : 0),
                height: 4,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(2),
                  color: done ? statusColor.withOpacity(0.7) : Colors.grey[800],
                ),
              ));
            })),
            const SizedBox(height: 8),
            Row(children: [
              Text('$turn/4 턴', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
              const Spacer(),
              if (room['deadline'] != null)
                Row(children: [
                  Icon(Icons.schedule, size: 12, color: Colors.grey[600]),
                  const SizedBox(width: 3),
                  Text(_formatDeadline(room['deadline']),
                    style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                ]),
            ]),
          ]),
        ),
      ),
    );
  }

  String _formatDeadline(String deadline) {
    try {
      final dt = DateTime.parse(deadline);
      final diff = dt.difference(DateTime.now());
      if (diff.isNegative) return '만료';
      if (diff.inHours > 0) return '${diff.inHours}시간 남음';
      return '${diff.inMinutes}분 남음';
    } catch (_) {
      return '';
    }
  }
}

// ── 교환일기 방 상세 화면 ──
class ExchangeRoomScreen extends StatefulWidget {
  final int roomId;
  const ExchangeRoomScreen({super.key, required this.roomId});

  @override
  State<ExchangeRoomScreen> createState() => _ExchangeRoomScreenState();
}

class _ExchangeRoomScreenState extends State<ExchangeRoomScreen> {
  final app = AppState();
  Map<String, dynamic>? room;
  bool loading = true;
  final contentCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/exchange-rooms/${widget.roomId}', options: app.authHeaders);
      setState(() { room = res.data['data']; loading = false; });
    } catch (e) {
      setState(() => loading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _writeDiary() async {
    final content = contentCtrl.text.trim();
    if (content.length < 200) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('200자 이상 작성해주세요.')));
      return;
    }
    try {
      final res = await app.dio.post('${app.baseUrl}/api/exchange-rooms/${widget.roomId}/diaries',
        data: {'content': content}, options: app.authHeaders);
      final data = res.data['data'];
      contentCtrl.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(data['isCompleted'] == true
            ? '4턴 완주! 관계 확장을 선택해주세요.'
            : '교환일기 작성 완료! (턴 ${data['nextTurn']})')));
      }
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _addReaction(int diaryId, String reaction) async {
    try {
      await app.dio.post('${app.baseUrl}/api/exchange-rooms/${widget.roomId}/diaries/$diaryId/reaction',
        data: {'reaction': reaction}, options: app.authHeaders);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$reaction 리액션 완료!')));
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _chooseNextStep(String choice) async {
    try {
      final res = await app.dio.post('${app.baseUrl}/api/exchange-rooms/${widget.roomId}/next-step',
        data: {'choice': choice}, options: app.authHeaders);
      final data = res.data['data'];
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('결과: ${data['status']}')));
      }
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _viewReport() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/exchange-rooms/${widget.roomId}/report', options: app.authHeaders);
      final data = res.data['data'];
      if (mounted) {
        showDialog(context: context, builder: (_) => AlertDialog(
          title: const Text('AI 공통점 리포트'),
          content: SingleChildScrollView(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('상태: ${data['status']}', style: const TextStyle(fontWeight: FontWeight.bold)),
            if (data['commonKeywords'] != null) ...[
              const SizedBox(height: 8),
              const Text('공통 키워드:', style: TextStyle(fontWeight: FontWeight.bold)),
              Wrap(children: (data['commonKeywords'] as List).map((k) =>
                Chip(label: Text(k), backgroundColor: Colors.orange.withOpacity(0.2))).toList()),
            ],
            if (data['emotionSimilarity'] != null)
              Text('감정 유사도: ${(data['emotionSimilarity'] * 100).toStringAsFixed(0)}%'),
            if (data['aiDescription'] != null) ...[
              const SizedBox(height: 8),
              Text(data['aiDescription']),
            ],
          ])),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('닫기'))],
        ));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _checkNextStepStatus() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/exchange-rooms/${widget.roomId}/next-step/status',
        options: app.authHeaders);
      final data = res.data['data'];
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('내 선택: ${data['myChoice'] ?? '미선택'} | 상대: ${data['partnerChose'] == true ? '완료' : '대기중'} | 상태: ${data['status']}')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return Scaffold(appBar: AppBar(), body: const Center(child: CircularProgressIndicator()));
    if (room == null) return Scaffold(appBar: AppBar(), body: const Center(child: Text('방 정보 로드 실패')));

    final diaries = (room!['diaries'] as List?) ?? [];
    final status = room!['status'] as String;
    final isMyTurn = room!['isMyTurn'] == true;
    final partner = room!['partner'];

    final totalTurns = (room!['totalTurns'] ?? 4) as int;
    final currentTurn = (room!['currentTurn'] ?? 0) as int;

    return Scaffold(
      appBar: AppBar(
        title: Text('${partner['nickname']}님과의 교환일기'),
        actions: [
          if (status == 'COMPLETED' || status == 'CHAT_CONNECTED' || status == 'ARCHIVED')
            IconButton(icon: const Icon(Icons.analytics), onPressed: _viewReport, tooltip: '리포트'),
          if (status == 'COMPLETED')
            IconButton(icon: const Icon(Icons.info_outline), onPressed: _checkNextStepStatus, tooltip: '선택 상태'),
        ],
      ),
      body: Column(children: [
        // ── 턴 진행 프로그레스 ──
        Container(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
          decoration: BoxDecoration(
            color: Colors.grey[900],
            border: Border(bottom: BorderSide(color: Colors.grey[800]!)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(Icons.menu_book, size: 18, color: Colors.orange[300]),
              const SizedBox(width: 6),
              Text('라운드 ${room!['roundNumber']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: status == 'COMPLETED'
                    ? Colors.green.withOpacity(0.2)
                    : isMyTurn ? Colors.orange.withOpacity(0.2) : Colors.blue.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  status == 'COMPLETED' ? '완주!' : isMyTurn ? '내 차례' : '상대 차례',
                  style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.bold,
                    color: status == 'COMPLETED' ? Colors.greenAccent : isMyTurn ? Colors.orangeAccent : Colors.blueAccent,
                  ),
                ),
              ),
            ]),
            const SizedBox(height: 10),
            Row(children: List.generate(totalTurns, (i) {
              final turnNum = i + 1;
              final done = turnNum <= diaries.length;
              final isCurrent = turnNum == currentTurn && status == 'ACTIVE';
              return Expanded(child: Container(
                margin: EdgeInsets.only(right: i < totalTurns - 1 ? 4 : 0),
                height: 6,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(3),
                  color: done ? Colors.orange[400]
                    : isCurrent ? Colors.orange.withOpacity(0.4)
                    : Colors.grey[700],
                ),
              ));
            })),
            const SizedBox(height: 6),
            Text('$currentTurn / $totalTurns 턴 진행됨',
              style: TextStyle(fontSize: 11, color: Colors.grey[500])),
          ]),
        ),

        // ── 일기 목록 (일기장 스타일) ──
        Expanded(child: diaries.isEmpty
          ? Center(child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.auto_stories, size: 56, color: Colors.grey[700]),
                const SizedBox(height: 12),
                Text('아직 작성된 일기가 없습니다', style: TextStyle(color: Colors.grey[600])),
                if (status == 'ACTIVE' && isMyTurn) ...[
                  const SizedBox(height: 8),
                  Text('첫 번째 일기를 작성해보세요!', style: TextStyle(color: Colors.orange[300], fontSize: 13)),
                ],
              ],
            ))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: 12),
                itemCount: diaries.length,
                separatorBuilder: (_, __) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
                  child: Row(children: [
                    Expanded(child: Divider(color: Colors.grey[800], thickness: 0.5)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Icon(Icons.swap_vert, size: 14, color: Colors.grey[700]),
                    ),
                    Expanded(child: Divider(color: Colors.grey[800], thickness: 0.5)),
                  ]),
                ),
                itemBuilder: (_, i) {
                  final d = diaries[i];
                  final isMe = d['authorId'] == app.userId;
                  final writerName = isMe ? '나의 일기' : '${partner['nickname']}의 일기';
                  final turnNum = d['turnNumber'] ?? (i + 1);
                  final createdAt = d['createdAt'] as String? ?? '';
                  final dateStr = createdAt.length >= 10 ? createdAt.substring(5, 10).replaceAll('-', '/') : '';

                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      color: Colors.grey[850] ?? const Color(0xFF1E1E1E),
                      border: Border.all(
                        color: isMe ? Colors.orange.withOpacity(0.25) : Colors.blue.withOpacity(0.2),
                        width: 1,
                      ),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Container(
                        padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
                        decoration: BoxDecoration(
                          color: isMe ? Colors.orange.withOpacity(0.08) : Colors.blue.withOpacity(0.06),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                        ),
                        child: Row(children: [
                          Icon(isMe ? Icons.edit_note : Icons.auto_stories,
                            size: 16, color: isMe ? Colors.orange[300] : Colors.blue[300]),
                          const SizedBox(width: 6),
                          Text(writerName, style: TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w600,
                            color: isMe ? Colors.orange[300] : Colors.blue[300],
                          )),
                          const Spacer(),
                          Text('$turnNum번째', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                          if (dateStr.isNotEmpty) ...[
                            Text(' · $dateStr', style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                          ],
                        ]),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                        child: Text(d['content'] ?? '',
                          style: const TextStyle(fontSize: 14.5, height: 1.7, letterSpacing: 0.1)),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                        child: Row(children: [
                          if (d['reaction'] != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.orange.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Text(_reactionEmoji(d['reaction']),
                                style: const TextStyle(fontSize: 16)),
                            ),
                          const Spacer(),
                          if (!isMe && d['reaction'] == null)
                            Row(children: ['HEART', 'HAPPY', 'SAD', 'FIRE'].map((r) =>
                              GestureDetector(
                                onTap: () => _addReaction(d['diaryId'], r),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 4),
                                  child: Text(_reactionEmoji(r), style: const TextStyle(fontSize: 20)),
                                ),
                              ),
                            ).toList()),
                        ]),
                      ),
                    ]),
                  );
                },
              ),
            )),

        // ── 작성 버튼 (내 차례일 때) ──
        if (status == 'ACTIVE' && isMyTurn)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey[900],
              border: Border(top: BorderSide(color: Colors.grey[800]!)),
            ),
            child: SizedBox(width: double.infinity, child: ElevatedButton.icon(
              onPressed: () => _showWriteSheet(context),
              icon: const Icon(Icons.edit),
              label: Text('${currentTurn}번째 일기 쓰기'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange[700],
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            )),
          ),

        // ── 상대 차례 안내 ──
        if (status == 'ACTIVE' && !isMyTurn)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.06),
              border: Border(top: BorderSide(color: Colors.grey[800]!)),
            ),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.hourglass_top, size: 16, color: Colors.blue[300]),
              const SizedBox(width: 6),
              Text('${partner['nickname']}님이 일기를 작성중이에요',
                style: TextStyle(color: Colors.blue[300], fontSize: 13)),
            ]),
          ),

        // ── 관계 확장 선택 (COMPLETED 상태) ──
        if (status == 'COMPLETED' && room!['nextStepRequired'] == true)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.06),
              border: Border(top: BorderSide(color: Colors.green.withOpacity(0.2)))),
            child: Column(children: [
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.celebration, size: 18, color: Colors.greenAccent),
                const SizedBox(width: 6),
                const Text('교환일기 완주!', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.greenAccent)),
              ]),
              const SizedBox(height: 4),
              Text('다음 단계를 선택해주세요', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: ElevatedButton.icon(
                  onPressed: () => _chooseNextStep('CHAT'),
                  icon: const Icon(Icons.chat_bubble_outline, size: 18),
                  label: const Text('채팅 시작'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue[700],
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                )),
                const SizedBox(width: 10),
                Expanded(child: OutlinedButton.icon(
                  onPressed: () => _chooseNextStep('CONTINUE'),
                  icon: const Icon(Icons.swap_horiz, size: 18),
                  label: const Text('교환 계속'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                )),
              ]),
            ]),
          ),
      ]),
    );
  }

  void _showWriteSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.grey[900],
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.of(context).viewInsets.bottom + 16),
        child: StatefulBuilder(builder: (ctx, setSheetState) {
          return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(child: Container(
              width: 36, height: 4,
              decoration: BoxDecoration(color: Colors.grey[700], borderRadius: BorderRadius.circular(2)),
            )),
            const SizedBox(height: 14),
            Row(children: [
              Icon(Icons.edit_note, color: Colors.orange[300], size: 20),
              const SizedBox(width: 6),
              Text('${room!['currentTurn']}번째 교환일기', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ]),
            const SizedBox(height: 12),
            TextField(
              controller: contentCtrl,
              maxLines: 8,
              autofocus: true,
              style: const TextStyle(fontSize: 15, height: 1.6),
              decoration: InputDecoration(
                hintText: '오늘 하루를 돌아보며 솔직하게 적어보세요...',
                hintStyle: TextStyle(color: Colors.grey[600]),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.orange[400]!),
                ),
              ),
              onChanged: (_) => setSheetState(() {}),
            ),
            const SizedBox(height: 8),
            Row(children: [
              Text('${contentCtrl.text.length}자',
                style: TextStyle(fontSize: 12, color: contentCtrl.text.length >= 200 ? Colors.green[400] : Colors.grey[500])),
              Text(' / 200~1,000자', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
              const Spacer(),
            ]),
            const SizedBox(height: 12),
            SizedBox(width: double.infinity, child: ElevatedButton(
              onPressed: contentCtrl.text.trim().length >= 200 ? () {
                Navigator.pop(ctx);
                _writeDiary();
              } : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange[700],
                disabledBackgroundColor: Colors.grey[800],
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('일기 제출', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            )),
          ]);
        }),
      ),
    );
  }

  String _reactionEmoji(String reaction) {
    switch (reaction) {
      case 'HEART': return '❤️';
      case 'SAD': return '😢';
      case 'HAPPY': return '😊';
      case 'FIRE': return '🔥';
      default: return reaction;
    }
  }
}

// ══════════════════════════════════════
// 7~8. 채팅 + 커플 탭
// ══════════════════════════════════════
class ChatTab extends StatefulWidget {
  final bool standaloneAppBar;
  const ChatTab({super.key, this.standaloneAppBar = true});

  @override
  State<ChatTab> createState() => _ChatTabState();
}

class _ChatTabState extends State<ChatTab> {
  final app = AppState();
  List<dynamic> chatRooms = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final res = await app.dio.get('${app.baseUrl}/api/chat-rooms', options: app.authHeaders);
      setState(() {
        chatRooms = res.data['data']['chatRooms'] ?? [];
        loading = false;
      });
    } catch (e) {
      setState(() => loading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.standaloneAppBar ? AppBar(title: const Text('채팅')) : null,
      body: loading
        ? const Center(child: CircularProgressIndicator())
        : chatRooms.isEmpty
          ? Center(child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.chat_bubble_outline, size: 64, color: Colors.white24),
                SizedBox(height: 12),
                Text('채팅방이 없어요', style: TextStyle(color: Colors.white54)),
                SizedBox(height: 8),
                Text('교환일기 완료 후 채팅이 시작됩니다', style: TextStyle(color: Colors.white38, fontSize: 13)),
              ],
            ))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.builder(
                itemCount: chatRooms.length,
                itemBuilder: (_, i) => _buildChatRoomCard(chatRooms[i]),
              ),
            ),
    );
  }

  Widget _buildChatRoomCard(Map<String, dynamic> room) {
    final status = room['status'] as String;
    Color statusColor = Colors.blueAccent;
    if (status == 'COUPLE_CONFIRMED') statusColor = Colors.pinkAccent;
    if (status == 'CHAT_LEFT') statusColor = Colors.grey;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: statusColor.withOpacity(0.2),
          child: Icon(status == 'COUPLE_CONFIRMED' ? Icons.favorite : Icons.chat, color: statusColor, size: 20),
        ),
        title: Text(room['partnerNickname'] ?? '???', style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(room['lastMessage'] ?? '대화를 시작해보세요', maxLines: 1, overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.white54, fontSize: 13)),
        trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          if (room['lastMessageAt'] != null)
            Text(_formatTime(room['lastMessageAt']), style: const TextStyle(fontSize: 11, color: Colors.white38)),
          if ((room['unreadCount'] ?? 0) > 0) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: Colors.orangeAccent, borderRadius: BorderRadius.circular(10)),
              child: Text('${room['unreadCount']}', style: const TextStyle(fontSize: 11, color: Colors.black)),
            ),
          ],
        ]),
        onTap: () => Navigator.push(context,
          MaterialPageRoute(builder: (_) => ChatRoomScreen(chatRoomId: room['chatRoomId'], partnerName: room['partnerNickname'] ?? '???'))),
      ),
    );
  }

  String _formatTime(String time) {
    try {
      final dt = DateTime.parse(time);
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) { return ''; }
  }
}

// ── 채팅방 상세 화면 ──
class ChatRoomScreen extends StatefulWidget {
  final int chatRoomId;
  final String partnerName;
  const ChatRoomScreen({super.key, required this.chatRoomId, required this.partnerName});

  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  final app = AppState();
  final msgCtrl = TextEditingController();
  final scrollCtrl = ScrollController();
  List<dynamic> messages = [];
  bool loading = true;
  bool hasMore = false;
  bool sending = false;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _startPolling();
  }

  @override
  void dispose() {
    _polling = false;
    super.dispose();
  }

  bool _polling = true;

  void _startPolling() async {
    while (_polling && mounted) {
      await Future.delayed(const Duration(seconds: 3));
      if (_polling && mounted && !sending) {
        _loadMessages();
      }
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (scrollCtrl.hasClients) {
        scrollCtrl.animateTo(scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
      }
    });
  }

  Future<void> _loadMessages({int? before}) async {
    try {
      final params = <String, dynamic>{'size': 30};
      if (before != null) params['before'] = before;
      final res = await app.dio.get('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/messages',
        queryParameters: params, options: app.authHeaders);
      final data = res.data['data'];
      setState(() {
        if (before != null) {
          messages.insertAll(0, data['messages'] ?? []);
        } else {
          messages = List.from(data['messages'] ?? []);
        }
        hasMore = data['hasMore'] == true;
        loading = false;
      });
      _scrollToBottom();
    } catch (e) {
      setState(() => loading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _send() async {
    final content = msgCtrl.text.trim();
    if (content.isEmpty || sending) return;
    setState(() => sending = true);

    try {
      await app.dio.post('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/messages',
        data: {'content': content, 'type': 'TEXT'}, options: app.authHeaders);
      msgCtrl.clear();
      await _loadMessages();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
    setState(() => sending = false);
  }

  Future<void> _showPartnerProfile() async {
    try {
      final res = await app.dio.get('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/profile',
        options: app.authHeaders);
      final p = res.data['data'];
      if (mounted) {
        showDialog(context: context, builder: (_) => AlertDialog(
          title: Text(p['nickname'] ?? '???'),
          content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('성별: ${p['gender'] ?? '비공개'}'),
            Text('생년월일: ${p['birthDate'] ?? '비공개'}'),
            Text('지역: ${p['sido'] ?? '비공개'}'),
            if (p['personalityKeywords'] != null && (p['personalityKeywords'] as List).isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text('성격 태그:', style: TextStyle(fontWeight: FontWeight.bold)),
              Wrap(spacing: 4, children: (p['personalityKeywords'] as List).map((k) =>
                Chip(label: Text(k is String ? k : k['label'] ?? '', style: const TextStyle(fontSize: 11)),
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap)).toList()),
            ],
          ]),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('닫기'))],
        ));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _sendCoupleRequest() async {
    try {
      final res = await app.dio.post('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/couple-request',
        options: app.authHeaders);
      final data = res.data['data'];
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('커플 요청 전송! (만료: ${data['expiresAt']})')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _acceptCouple() async {
    try {
      await app.dio.post('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/couple-accept',
        options: app.authHeaders);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('커플이 되었습니다!')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _rejectCouple() async {
    try {
      await app.dio.post('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/couple-reject',
        options: app.authHeaders);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('커플 요청을 거절했습니다.')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  Future<void> _leaveChatRoom() async {
    final confirmed = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('채팅방 나가기'),
      content: const Text('나가면 다시 돌아올 수 없습니다. 정말 나가시겠어요?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('취소')),
        TextButton(onPressed: () => Navigator.pop(context, true),
          child: const Text('나가기', style: TextStyle(color: Colors.red))),
      ],
    ));
    if (confirmed != true) return;

    try {
      await app.dio.post('${app.baseUrl}/api/chat-rooms/${widget.chatRoomId}/leave', options: app.authHeaders);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('채팅방을 나갔습니다.')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(app.errMsg(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.partnerName),
        actions: [
          IconButton(icon: const Icon(Icons.person), onPressed: _showPartnerProfile, tooltip: '프로필'),
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'couple_request') _sendCoupleRequest();
              if (v == 'couple_accept') _acceptCouple();
              if (v == 'couple_reject') _rejectCouple();
              if (v == 'leave') _leaveChatRoom();
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'couple_request', child: Text('커플 요청')),
              const PopupMenuItem(value: 'couple_accept', child: Text('커플 수락')),
              const PopupMenuItem(value: 'couple_reject', child: Text('커플 거절')),
              const PopupMenuItem(value: 'leave', child: Text('나가기', style: TextStyle(color: Colors.red))),
            ],
          ),
        ],
      ),
      body: Column(children: [
        Expanded(
          child: loading
            ? const Center(child: CircularProgressIndicator())
            : messages.isEmpty
              ? const Center(child: Text('대화를 시작해보세요!', style: TextStyle(color: Colors.white54)))
              : ListView.builder(
                  controller: scrollCtrl,
                  itemCount: messages.length,
                  itemBuilder: (_, i) {
                    final msg = messages[i];
                    final isMe = msg['senderId'] == app.userId;
                    final isSystem = msg['type'] == 'SYSTEM';

                    if (isSystem) {
                      return Center(child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Text(msg['content'] ?? '', style: const TextStyle(color: Colors.white38, fontSize: 12)),
                      ));
                    }

                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: EdgeInsets.fromLTRB(isMe ? 64 : 8, 2, isMe ? 8 : 64, 2),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: isMe ? Colors.orange.withOpacity(0.3) : Colors.grey[800],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(msg['content'] ?? '', style: const TextStyle(fontSize: 14)),
                          const SizedBox(height: 2),
                          Text(
                            msg['createdAt'] != null ? _formatMsgTime(msg['createdAt']) : '',
                            style: const TextStyle(fontSize: 10, color: Colors.white38),
                          ),
                          if (msg['isFlagged'] == true)
                            const Text('! 외부연락처 감지', style: TextStyle(fontSize: 10, color: Colors.redAccent)),
                        ]),
                      ),
                    );
                  },
                ),
        ),

        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: Colors.grey[900], border: Border(top: BorderSide(color: Colors.grey[800]!))),
          child: Row(children: [
            Expanded(child: TextField(
              controller: msgCtrl,
              decoration: const InputDecoration(
                hintText: '메시지를 입력하세요',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              onSubmitted: (_) => _send(),
            )),
            const SizedBox(width: 8),
            IconButton(
              icon: Icon(Icons.send, color: sending ? Colors.grey : Colors.orangeAccent),
              onPressed: sending ? null : _send,
            ),
          ]),
        ),
      ]),
    );
  }

  String _formatMsgTime(String time) {
    try {
      final dt = DateTime.parse(time);
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) { return ''; }
  }
}

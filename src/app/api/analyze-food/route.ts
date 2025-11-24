import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { image, mealType } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Imagem não fornecida' },
        { status: 400 }
      );
    }

    // Chave da API OpenAI das variáveis de ambiente
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY não encontrada nas variáveis de ambiente');
      return NextResponse.json(
        { 
          error: 'Chave da API OpenAI não configurada',
          message: '🔑 Configure a variável OPENAI_API_KEY nas configurações do projeto'
        },
        { status: 500 }
      );
    }

    console.log('✅ Iniciando análise de imagem com OpenAI Vision...');

    // Chamar API da OpenAI Vision
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um nutricionista especializado em análise de alimentos. Analise a imagem fornecida e retorne APENAS um JSON válido (sem markdown, sem explicações extras) com a seguinte estrutura:

{
  "calories": número_total_de_calorias,
  "description": "descrição_detalhada_da_refeição",
  "foods": ["alimento1", "alimento2", "alimento3"],
  "portions": "descrição_das_porções_estimadas",
  "confidence": "alta|média|baixa",
  "sources": "Fontes: Google Nutrition, Tabela TACO, USDA"
}

IMPORTANTE:
- Seja preciso nas calorias baseando-se em porções visíveis
- Liste todos os alimentos identificados
- Indique o nível de confiança da análise
- Use dados nutricionais de fontes confiáveis (Google Nutrition, Tabela TACO, USDA)
- Retorne APENAS o JSON, sem texto adicional`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analise esta ${mealType || 'refeição'} e forneça informações nutricionais detalhadas.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro da API OpenAI:', errorData);
      
      if (response.status === 401) {
        return NextResponse.json(
          { 
            error: 'Chave da API OpenAI inválida ou expirada',
            message: '🔑 A chave da API OpenAI está inválida. Verifique se você configurou a chave correta nas variáveis de ambiente.'
          },
          { status: 401 }
        );
      }
      
      if (response.status === 429) {
        return NextResponse.json(
          { 
            error: 'Limite de requisições excedido',
            message: '⏱️ Você atingiu o limite de requisições da API OpenAI. Aguarde alguns minutos e tente novamente.'
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Erro ao analisar imagem com IA', 
          message: errorData.error?.message || 'Erro desconhecido ao processar a imagem',
          details: errorData 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Resposta recebida da OpenAI');
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Resposta inválida da API OpenAI:', data);
      return NextResponse.json(
        { 
          error: 'Resposta inválida da API OpenAI',
          message: 'A API retornou uma resposta em formato inesperado. Tente novamente.'
        },
        { status: 500 }
      );
    }

    const content = data.choices[0].message.content;
    console.log('📝 Conteúdo recebido:', content.substring(0, 200) + '...');
    
    // Tentar extrair JSON da resposta (caso venha com markdown)
    let analysisResult;
    try {
      // Remover possíveis markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleanContent);
      console.log('✅ JSON parseado com sucesso');
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.log('📄 Conteúdo completo recebido:', content);
      
      // Fallback: tentar extrair informações básicas
      return NextResponse.json(
        { 
          error: 'Erro ao processar resposta da IA',
          message: 'A IA retornou uma resposta em formato inesperado. Tente novamente com outra imagem.',
          rawContent: content
        },
        { status: 500 }
      );
    }

    // Validar estrutura do resultado
    if (!analysisResult.calories || typeof analysisResult.calories !== 'number') {
      console.error('❌ Análise incompleta - calorias não encontradas:', analysisResult);
      return NextResponse.json(
        { 
          error: 'Análise incompleta',
          message: 'Não foi possível identificar as calorias na imagem. Tente com uma foto mais clara da refeição.'
        },
        { status: 500 }
      );
    }

    console.log('✅ Análise concluída com sucesso:', {
      calories: analysisResult.calories,
      foods: analysisResult.foods?.length || 0,
      confidence: analysisResult.confidence
    });

    return NextResponse.json({
      calories: Math.round(analysisResult.calories),
      description: analysisResult.description || 'Refeição analisada',
      foods: analysisResult.foods || [],
      portions: analysisResult.portions || 'Porção estimada',
      confidence: analysisResult.confidence || 'média',
      sources: analysisResult.sources || 'Fontes: Google Nutrition, Tabela TACO, USDA',
    });

  } catch (error) {
    console.error('❌ Erro ao processar análise:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao processar análise',
        message: error instanceof Error ? error.message : 'Erro desconhecido ao analisar a imagem. Tente novamente.'
      },
      { status: 500 }
    );
  }
}
